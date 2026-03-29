# Config Schema: SecretRef Support

## Overview

Extends config.json to support secret references using handlebar syntax. Any string field can embed `${{secretRef.secretName}}` to reference a secret resolved at startup from a registered provider.

---

## Syntax

```
${{secretRef.<secretName>}}
```

- `secretName` is a key defined in `secrets.entries`.
- The entire handlebar is replaced with the resolved secret value.
- Can be the full value or embedded in a string.
- Same syntax used in both config-level resolution AND proxy-level resolution (headers, query params, body).

---

## How a Field Switches from Plain String to SecretRef

### Before (plain string)

```json
{
  "chat": {
    "telegram": {
      "botToken": "123456:ABC-DEF..."
    }
  }
}
```

### After (secretRef)

```json
{
  "chat": {
    "telegram": {
      "botToken": "${{secretRef.telegramBotToken}}"
    }
  }
}
```

The field name stays the same. The value becomes a string containing the handlebar.

---

## Backward Compatibility

Plain strings without handlebars are used as-is. No resolution needed.

| Value | Behavior |
|---|---|
| `"some-plain-string"` | Used as-is. No resolution. |
| `"${{secretRef.mySecret}}"` | Entire value resolved from provider. |
| `"Bearer ${{secretRef.apiToken}}"` | Handlebar portion resolved, rest of string kept. |
| `123`, `true`, `null`, `[...]` | Pass-through. Only strings are scanned for handlebars. |

The `Config` TypeScript interface does not change. After resolution, all handlebars have been replaced with actual values. Validation runs on the resolved config.

---

## Multi-Provider Secrets Mapping

Secrets support **multiple named provider instances**. Each provider has a user-chosen name and a `type` field as discriminator. Multiple instances of the same type are allowed (e.g., two Key Vaults). Each entry maps to a specific provider instance.

```json
{
  "secrets": {
    "providers": {
      "vault-prod": { "type": "azure-keyvault", "vaultUrl": "https://prod.vault.azure.net" },
      "vault-staging": { "type": "azure-keyvault", "vaultUrl": "https://staging.vault.azure.net" },
      "my-env": { "type": "env" }
    },
    "entries": {
      "telegramBotToken": { "provider": "vault-prod", "key": "telegram-bot-token" },
      "googleCalendarToken": { "provider": "vault-prod", "key": "google-calendar-token" },
      "stagingToken": { "provider": "vault-staging", "key": "staging-token" },
      "devToken": { "provider": "my-env", "key": "DEV_TOKEN" }
    }
  }
}
```

| Field | Required | Description |
|---|---|---|
| `providers` | Yes | Map of user-chosen instance name to provider config. |
| `providers.<name>` | -- | Must contain `type` (string) plus type-specific fields. |
| `providers.<name>.type` | Yes | Provider type discriminator: `"azure-keyvault"` or `"env"`. |
| `entries` | Yes | Map of `handlebarName` to `{ provider, key }`. |
| `entries.<name>.provider` | Yes | Which provider instance to resolve this secret from. Must match a key in `providers`. |
| `entries.<name>.key` | Yes | The provider-specific secret key (e.g., Key Vault secret name, env var name). |

### Provider Name Rules

- Names must match `[a-zA-Z0-9_-]+`.
- Invalid names cause hard startup failure.

### Startup Validation (hard failures)

- Unknown `type` value in any provider.
- Missing `type` field in any provider.
- Provider name violates `[a-zA-Z0-9_-]` pattern.
- Entry references a provider name not in `providers`.

---

## Security Config

### Env Var Blacklist

Configurable list of environment variables to strip before passing `process.env` to Claude Code child processes.

```json
{
  "security": {
    "blacklistEnv": ["AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "AZURE_TENANT_ID"]
  }
}
```

| Field | Required | Description |
|---|---|---|
| `security.blacklistEnv` | No | Array of env var names to strip from child process environment. Defaults to empty list. |

The code in `claude-code.ts` reads this list and filters `process.env` accordingly before spawning the child process.

---

## Proxy Config

The proxy is optional. It only starts if the `proxy` config block exists.

```json
{
  "proxy": {
    "port": 9090,
    "bypassWhitelist": false,
    "whitelist": [
      "googleapis.com",
      "graph.microsoft.com"
    ]
  }
}
```

| Field | Required | Default | Description |
|---|---|---|---|
| `proxy.port` | No | `9090` | Port the proxy listens on. |
| `proxy.bypassWhitelist` | No | `false` | If `true`, all URLs allowed (dev only). Logs WARNING on **every proxied request**. |
| `proxy.whitelist` | Yes (if bypassWhitelist is false) | -- | Allowed upstream targets. Each entry is either a domain (e.g. `"googleapis.com"`) or `host:port` (e.g. `"127.0.0.1:3000"`). Entry without `:` matches hostname only. Entry with `:` matches `hostname:port`. |

### Proxy routing

Routing uses the `x-assurgent-upstream` header instead of path-encoded URLs.

The agent sends requests to `http://127.0.0.1:<port>/<path>` with header `x-assurgent-upstream: <upstream-base-url>`.

**URL construction:**
1. Trim trailing `/` from header value.
2. Trim leading `/` from request path.
3. Join with `/`.

Examples:
- `https://googleapis.com` + `/calendar/v3/events` = `https://googleapis.com/calendar/v3/events`
- `https://googleapis.com/v1/` + `/calendars/events` = `https://googleapis.com/v1/calendars/events`

**Header rules:**
- Missing header: 400 with `{"error": "Missing x-assurgent-upstream header", "hint": "Set the x-assurgent-upstream header to the target base URL, e.g. https://googleapis.com"}`
- Duplicate header: 400 with clear JSON error.
- No scheme in header: default to `https://`.
- Handlebars (`${{secretRef.*}}`) NOT resolved in this header. It is a plain URL.
- Query strings in header: NOT supported. Query params come from the request URL only.
- The `x-assurgent-upstream` header is stripped before forwarding to upstream.

**Whitelist checking:**
- Extract hostname (and port, if present) from the resolved upstream URL.
- For each whitelist entry:
  - If entry contains `:`, match against `hostname:port` of the upstream URL.
  - If entry has no `:`, match against hostname only.
- `bypassWhitelist: true` skips the check but logs a WARNING per request.

### Proxy behavior (unchanged)

- Resolves `${{secretRef.*}}` handlebars in request **headers** (except `x-assurgent-upstream`), **URL query params**, and **request body**.
- Strips auth headers from proxy **responses** (`Authorization`, `X-Api-Key`, etc.) to prevent secret leakage. Does not scan response body.
- Binds to `127.0.0.1` only.
- No per-secret URL scoping -- the whitelist is sufficient access control.

---

## Example: Full Config with SecretRef + Proxy

```json
{
  "secrets": {
    "providers": {
      "vault-prod": { "type": "azure-keyvault", "vaultUrl": "https://mild-bot-vault.vault.azure.net" },
      "my-env": { "type": "env" }
    },
    "entries": {
      "telegramBotToken": { "provider": "vault-prod", "key": "telegram-bot-token" },
      "googleCalendarToken": { "provider": "vault-prod", "key": "google-calendar-token" },
      "devToken": { "provider": "my-env", "key": "DEV_TOKEN" }
    }
  },
  "security": {
    "blacklistEnv": ["AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "AZURE_TENANT_ID"]
  },
  "chat": {
    "adapter": "telegram",
    "telegram": {
      "botToken": "${{secretRef.telegramBotToken}}",
      "allowedUserIds": ["6562752036"],
      "placeholder": {
        "enabled": true,
        "text": "thinking..."
      }
    }
  },
  "agent": {
    "adapter": "claude-code",
    "claude-code": {
      "model": "sonnet",
      "maxTurns": 10,
      "flags": ["--dangerously-skip-permissions"]
    }
  },
  "session": {
    "turnLimit": 20
  },
  "proxy": {
    "port": 9090,
    "bypassWhitelist": false,
    "whitelist": [
      "googleapis.com",
      "graph.microsoft.com"
    ]
  },
  "workspacePath": "/home/mylucia/assurgent"
}
```

---

## Validation Rules

### Pre-resolution (raw config)

1. If any `${{secretRef.*}}` handlebars exist, the `secrets` key must be present.
2. Every handlebar name must exist in `secrets.entries`.
3. Every entry's `provider` must exist in `secrets.providers`.

### Post-resolution (resolved config)

4. All existing `validateConfig()` rules apply unchanged.
5. No `${{secretRef.*}}` patterns should remain. If any do, resolution failed -- throw an error.

### Error Messages

Errors must include the config path and secret name:

```
Failed to resolve secret "telegramBotToken" at config path: chat.telegram.botToken
```

---

## loadConfig Flow Change

```
Before:
  JSON.parse -> validateConfig -> return Config

After:
  JSON.parse -> resolveSecrets (async) -> validateConfig -> return Config
```

`loadConfig` is **always async** -- one code path regardless of whether secrets exist.

```typescript
// Before
export function loadConfig(configPath?: string): Config;

// After
export async function loadConfig(configPath?: string): Promise<Config>;
```

All callers of `loadConfig` must be updated to await.
