# Secret Access: Azure Key Vault with Service Principal

## Decision

We will migrate all secrets in `config.json` to `${{secretRef.*}}` backed by multiple secret providers (Azure Key Vault, env vars). Each secret entry maps to a specific provider. Authentication for Key Vault uses Service Principal (SP) credentials set as environment variables on the server.

This document does not argue for or against this decision. It documents what the approach gives us, what it does not solve, and how to harden it.

---

## Primary Threat Model: AI Agent with CLI Access

The bot spawns Claude Code with `--dangerously-skip-permissions`, which means the AI agent can execute **any CLI command** on the server. This is the primary threat this design addresses.

The key constraints that make the defense work:

1. Claude Code runs as a non-root user (`botuser`)
2. Claude Code cannot run `sudo` (not in sudoers, no password)
3. Claude Code is a child process spawned via `execa` -- child processes inherit parent env vars **by default**

Without mitigation, the AI could simply run `echo $AZURE_CLIENT_SECRET` and use the SP to read every secret from Key Vault. Or it could call the Azure CLI directly to fetch secrets.

### How This Design Neutralizes the AI Threat

```
[systemd] loads /etc/assurgent-bot/sp.env (root:root, chmod 600)
    |
    v
[bot process] has AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID in env
    |
    |--- at startup: uses SP to fetch secrets from Key Vault
    |
    |--- when spawning Claude Code: STRIPS blacklisted env vars from child env
    |
    v
[Claude Code process] has NO blacklisted env vars
    |
    |--- cannot `echo $AZURE_CLIENT_SECRET` (not in env)
    |--- cannot `cat /etc/assurgent-bot/sp.env` (root-owned, chmod 600, not root)
    |--- cannot `sudo cat ...` (no sudo access)
    |--- cannot call `az keyvault secret show ...` (no credentials)
    |--- cannot read `/proc/$PPID/environ` (different user or same user but
    |    parent PID environ is readable -- see hardening note below)
    |
    v
[Result] AI agent has broad CLI permissions but ZERO access to infrastructure secrets
```

**This is the real security win.** Not protecting against humans with SSH -- protecting against an AI agent that can run arbitrary commands but should not access secrets.

### Critical Implementation Requirement: Env Var Blacklist

The bot currently passes `...process.env` when spawning Claude Code (`src/agent/claude-code.ts`). This **must** be changed to strip blacklisted env vars using the configurable `security.blacklistEnv` list from config.json:

```json
{
  "security": {
    "blacklistEnv": ["AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "AZURE_TENANT_ID"]
  }
}
```

```typescript
// in src/agent/claude-code.ts -- invoke method
const blacklist = new Set(config.security?.blacklistEnv ?? []);
const safeEnv: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (!blacklist.has(key) && value !== undefined) {
    safeEnv[key] = value;
  }
}

const proc = await execa(this.config.claudePath ?? "claude", args, {
  cwd: this.workspacePath,
  timeout: 180_000,
  stdin: "ignore",
  env: {
    ...safeEnv,
    AGENT_SESSION_ID: options.sessionId ?? "",
  },
});
```

This approach is configurable -- users can add any sensitive env vars to the blacklist without code changes.

---

## What This Buys Us

| Benefit | Explanation |
|---|---|
| **AI cannot access secrets** | The primary win. Claude Code has broad CLI permissions but no path to SP credentials or Key Vault. See threat model above. |
| **Secrets rotation without redeployment** | Rotate the Telegram token (or any future secret) in Key Vault. The bot picks it up on next startup -- no config file edits, no git commits, no SCP. |
| **Audit logging** | Key Vault logs every secret read. You know exactly when a secret was accessed and by which identity. `config.json` has no audit trail. |
| **Secrets never in git** | Even accidentally. No risk of `git add config.json` leaking a token. The config file contains only `${{secretRef.secretName}}` handlebars, which are safe to commit. |
| **Centralized secret management** | If you add more services later (webhook receiver, monitoring bot, API backend), they all pull from one vault. No copy-pasting tokens across machines. |
| **Defense against disk exposure** | If someone gets a copy of your filesystem (backup leak, disk image, old drive not wiped), they get `${{secretRef.*}}` pointers, not actual secrets. |

## What This Does NOT Solve

| Limitation | Explanation |
|---|---|
| **Root SSH access = game over** | Anyone with root SSH access can read the env file, read `/proc/<pid>/environ`, or just attach a debugger. Key Vault does not help here. This is true of every secret management system on a single server. |
| **`/proc/<pid>/environ` for same-user processes** | If Claude Code runs as the same user as the bot (`botuser`), it could potentially read `/proc/<BOTPID>/environ`. See hardening section for mitigation. |
| **Compromised bot process itself** | If a supply-chain attack compromises a dependency that runs inside the bot process (not Claude Code), it has access to the SP env vars in `process.env`. Key Vault reduces the file-read attack surface but not the in-process attack surface. |

### Honest Assessment

- **Against the AI agent:** This design genuinely works. The AI has no path to SP credentials as long as env stripping is implemented and the EnvironmentFile is root-owned.
- **Against humans with SSH + sudo:** This does not help much. A human with root access can read anything. The value here is operational hygiene (rotation, audit, no secrets in git), not access control.

---

## Practical Hardening

### 1. Env Var Blacklist in execa (CRITICAL)

This is the single most important hardening step. Without it, the entire design fails.

Strip all blacklisted env vars when spawning Claude Code. The blacklist is configurable via `security.blacklistEnv` in config.json. Default recommended blacklist:

- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_TENANT_ID`

### 2. systemd EnvironmentFile (root-owned, chmod 600)

Do not put SP credentials in `.bashrc`, `.profile`, or the systemd unit file directly. Use a separate environment file:

```ini
# /etc/assurgent-bot/sp.env
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

```ini
# /etc/systemd/system/assurgent-bot.service
[Service]
EnvironmentFile=/etc/assurgent-bot/sp.env
ExecStart=/usr/bin/node /path/to/bot/index.js
User=botuser
```

Then lock down the env file:

```bash
chmod 600 /etc/assurgent-bot/sp.env
chown root:root /etc/assurgent-bot/sp.env
```

Why this matters for the AI threat:

- Claude Code cannot `cat /etc/assurgent-bot/sp.env` (owned by root, mode 600, Claude Code is not root)
- Claude Code cannot `sudo cat ...` (no sudo access)
- The SP credentials exist only in the bot's process environment, which Claude Code never receives (because of env stripping)

### 3. Mitigate `/proc/<pid>/environ` Read

If the bot and Claude Code run as the same OS user, Claude Code could read `/proc/<BOTPID>/environ` to extract the SP credentials.

Mitigations:

- **Option A (recommended):** Set `hidepid=2` on `/proc` mount so processes can only see their own `/proc/<pid>` entries. This is a kernel-level setting.
- **Option B:** Run Claude Code as a different OS user than the bot. This requires the bot to use `su` or a wrapper when spawning Claude Code.
- **Option C:** Accept the risk. The AI would need to know to look there, discover the bot's PID, and parse the environ format. This is a weak defense but adds friction.

```bash
# Option A: add to /etc/fstab
proc /proc proc defaults,hidepid=2 0 0
```

### 4. Least-Privilege SP Permissions

Assign the SP only the **Key Vault Secrets User** role (read-only). Never assign:

- `Key Vault Contributor` (can modify vault settings)
- `Key Vault Secrets Officer` (can create/delete secrets)
- `Key Vault Administrator` (full control)

```bash
# Assign read-only secret access scoped to the specific vault
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee <SP_CLIENT_ID> \
  --scope /subscriptions/<SUB_ID>/resourceGroups/<RG>/providers/Microsoft.KeyVault/vaults/<VAULT_NAME>
```

The `--scope` flag is critical. Scope to the specific vault, not the resource group or subscription.

### 5. RBAC vs Access Policies

Use **Azure RBAC** (not legacy vault access policies):

```bash
az keyvault create \
  --name <VAULT_NAME> \
  --resource-group <RG> \
  --enable-rbac-authorization true
```

### 6. Enable Key Vault Audit Logging

```bash
az monitor diagnostic-settings create \
  --resource /subscriptions/<SUB_ID>/resourceGroups/<RG>/providers/Microsoft.KeyVault/vaults/<VAULT_NAME> \
  --name "kv-audit" \
  --logs '[{"category":"AuditEvent","enabled":true}]' \
  --workspace <LOG_ANALYTICS_WORKSPACE_ID>
```

This logs every `SecretGet`, `SecretList`, `SecretSet` operation. If the SP is used from an unexpected IP or at an unexpected time, you will see it.

### 7. Rotate the SP Secret

SP client secrets have an expiry (default 2 years in Entra). Set a calendar reminder to rotate before expiry:

```bash
# Create new credential
az ad app credential reset --id <APP_ID> --years 1

# Update /etc/assurgent-bot/sp.env with new secret
# Restart the service
systemctl restart assurgent-bot
```

---

## Updated Threat Matrix

| Threat | Key Vault + env stripping helps? | Notes |
|---|---|---|
| **AI agent (Claude Code) with CLI access** | **Yes -- this is the primary win** | AI has no env vars, cannot read root-owned file, cannot sudo. Zero path to secrets. |
| Remote attacker, no shell | Yes -- secrets not on disk | Config only has `${{secretRef.*}}` pointers |
| Compromised npm dependency (in bot process) | Partially | Secrets not in files, but `process.env` is accessible within the bot process |
| Compromised npm dependency (in Claude Code) | Yes | Claude Code process has no blacklisted env vars |
| SSH access (non-root, non-botuser) | Marginally | Cannot read env file (root-owned) or bot process environ (different user) |
| SSH access (root) | No | Root can read anything on the system |
| Leaked disk / backup | Yes | Can rotate SP, secrets not in config files |
| Azure portal compromise | No | But audit logs help with detection |

---

## Generic Secret Proxy

### Overview

The bot process (which holds resolved secrets in memory) acts as a **generic HTTP proxy**. The AI makes normal HTTP calls but changes the base URL to the proxy and uses `${{secretRef.*}}` handlebar syntax. The bot resolves the secret and forwards the request. The AI never sees the real credential.

**Bundled into milestone 5** -- not a future milestone.

### How It Works

```
Claude Code                             Bot Process                        External API
    |                                       |                                  |
    |-- GET localhost:<port>/proxy/          |                                  |
    |   googleapis.com/calendar/v3/events   |                                  |
    |   Authorization: Bearer               |                                  |
    |     ${{secretRef.googleCalendarToken}} |                                  |
    |                                       |-- resolve secretRef from memory  |
    |                                       |                                  |
    |                                       |-- GET googleapis.com/calendar/.. |
    |                                       |   Authorization: Bearer <real>   |
    |                                       |                                  |
    |                                       |<-- 200 { events: [...] } --------|
    |<-- 200 { events: [...] } -------------|                                  |
    |   (auth headers stripped from resp)   |                                  |
```

### Proxy Config

```json
{
  "proxy": {
    "port": 9090,
    "bypassWhitelist": false,
    "whitelist": [
      "googleapis.com/calendar/v3/**",
      "graph.microsoft.com/v1.0/me/calendar/**"
    ]
  }
}
```

- **Port is configurable** via `proxy.port`.
- **Proxy only starts if `proxy` config block exists** in config.json. No proxy block = no proxy server.
- **No per-secret URL scoping** -- the whitelist is sufficient access control.

### Handlebar Resolution Scope

The proxy resolves `${{secretRef.*}}` handlebars in:

1. **Request headers** -- e.g., `Authorization: Bearer ${{secretRef.token}}`
2. **URL query parameters** -- e.g., `?api_key=${{secretRef.apiKey}}`
3. **Request body** -- e.g., JSON body containing `${{secretRef.webhookSecret}}`

Same `${{secretRef.*}}` syntax as config-level resolution. No special proxy-specific syntax.

### Auth Header Stripping

The proxy **strips auth-related headers from responses** before returning to the AI:

- `Authorization`
- `X-Api-Key`
- `X-Api-Secret`
- Any header starting with `X-Secret-`

This prevents secret leakage if an API echoes back auth headers in responses. The proxy does **not** scan response bodies.

### `bypassWhitelist` Flag

| Value | Behavior |
|-------|----------|
| `false` (default) | Proxy only forwards requests to URLs matching the whitelist. Returns 403 for everything else. **Use this in production.** |
| `true` | Proxy forwards to any URL. Whitelist is ignored. **Use for development/debugging only.** |

When `bypassWhitelist` is `true`, the proxy logs a warning at startup.

### Code Sketch

```typescript
import { Hono } from "hono";

interface ProxyConfig {
  port: number;
  bypassWhitelist: boolean;
  whitelist: string[];
}

const AUTH_RESPONSE_HEADERS = new Set([
  "authorization", "x-api-key", "x-api-secret",
]);

function createProxy(config: ProxyConfig, resolvedSecrets: Record<string, string>): Hono {
  const app = new Hono();

  const resolveHandlebars = (text: string): string =>
    text.replace(/\$\{\{secretRef\.(\w+)\}\}/g, (_, name) => {
      const secret = resolvedSecrets[name];
      if (!secret) throw new Error(`Unknown secretRef: ${name}`);
      return secret;
    });

  // Resolve handlebars in headers
  const resolveHeaders = (headers: Headers): Record<string, string> => {
    const resolved: Record<string, string> = {};
    for (const [key, value] of headers.entries()) {
      if (key === "host") continue;
      resolved[key] = resolveHandlebars(value);
    }
    return resolved;
  };

  // Strip auth headers from response
  const stripAuthHeaders = (headers: Headers): Record<string, string> => {
    const clean: Record<string, string> = {};
    for (const [key, value] of headers.entries()) {
      if (AUTH_RESPONSE_HEADERS.has(key.toLowerCase())) continue;
      if (key.toLowerCase().startsWith("x-secret-")) continue;
      clean[key] = value;
    }
    return clean;
  };

  app.all("/proxy/*", async (c) => {
    const targetUrl = c.req.path.replace("/proxy/", "");
    const queryString = new URL(c.req.url).search;
    const resolvedQuery = resolveHandlebars(queryString);

    if (!config.bypassWhitelist) {
      const isAllowed = config.whitelist.some((pattern) => /* glob match */ true);
      if (!isAllowed) {
        return c.json({ error: `URL not in whitelist: ${targetUrl}` }, 403);
      }
    }

    const resolvedHeaders = resolveHeaders(c.req.raw.headers);

    // Resolve handlebars in body
    let body: string | undefined;
    if (c.req.method !== "GET" && c.req.method !== "HEAD") {
      const rawBody = await c.req.text();
      body = resolveHandlebars(rawBody);
    }

    const res = await fetch(`https://${targetUrl}${resolvedQuery}`, {
      method: c.req.method,
      headers: resolvedHeaders,
      body,
    });

    const responseHeaders = stripAuthHeaders(res.headers);
    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  });

  return app;
}
```

### AI Discovery

The AI learns about the proxy via:

1. **CLAUDE.md** -- brief mention that a secret proxy exists at `localhost:<port>`.
2. **Per-skill docs** -- each skill's documentation explains which proxy endpoints it uses and which `${{secretRef.*}}` names are available.

### Safety Rules

- **Bind to `127.0.0.1` only** -- not accessible from network
- **`bypassWhitelist: false` in production** -- always
- **Scope tokens narrowly** -- read-only tokens where possible
- **Rate limiting optional** -- add per-endpoint rate limits if needed

### Why This Works

| Check | Result |
|-------|--------|
| Can AI read the secret from the proxy? | No -- proxy resolves `${{secretRef.*}}` server-side, returns only data |
| Can AI read the proxy's source code? | Yes, but secrets aren't in code -- resolved from Key Vault at runtime |
| Can AI read the bot's env vars? | No -- stripped via blacklist |
| Can AI call the proxy? | Yes -- that's the point |
| Can AI hit unintended URLs? | Only if `bypassWhitelist: true` or URL matches whitelist |

---

## Bottom Line

The primary value of this design is **preventing the AI agent from accessing infrastructure secrets**. The bot grants Claude Code broad CLI permissions via `--dangerously-skip-permissions`, but by combining systemd EnvironmentFile (root-owned) with configurable env var blacklist stripping in the `execa` call, the AI has zero path to SP credentials or Key Vault secrets.

The secondary value is operational hygiene: secrets stay out of git, rotation is centralized, and access is audited.

The proxy extends this model to let the AI **use** secrets (via HTTP calls) without **reading** them. Secrets are resolved server-side and never exposed to the child process.
