# assurgent

A lightweight bridge between any **chat platform** and any **coding agent** — talk to your AI coding agent from anywhere.

> **Warning:** This project is under active development. APIs may introduce breaking changes at any time. Use at your own risk.

> The name *assurgent* carries two meanings: a botanical term for a branch that grows upward (like this project, still growing), and a nod to *agent* hiding in plain sight — **assur·gent**.

```
You (Chat) → assurgent → Coding Agent → Response → You (Chat)
```

Not an agent itself. A thin bridge with automatic session management, pluggable on both sides.

## Currently Supported

| Chat Platform | Coding Agent |
|---|---|
| Telegram | Claude Code CLI |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

### Install & Configure

```bash
bunx assurgent init
```

This creates `~/.assurgent/config.json` from the bundled template. Edit it:

```json
{
  "chat": {
    "adapter": "telegram",
    "telegram": {
      "botToken": "YOUR_BOT_TOKEN_HERE",
      "allowedUserIds": ["YOUR_TELEGRAM_USER_ID"]
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
  "workspacePath": "/path/to/your/workspace"
}
```

To find your Telegram user ID, message [@userinfobot](https://t.me/userinfobot).

> If `claude` is not in your PATH (common on servers), set `claudePath` to the full path, e.g. `/home/user/.local/bin/claude`.

### Run

```bash
bunx assurgent
```

Then message your bot on Telegram.

### Custom Config Location

Set `ASSURGENT_HOME` to use a different config directory:

```bash
ASSURGENT_HOME=/custom/path bunx assurgent
```

Default: `~/.assurgent/`

## Bot Commands

| Command | Description |
|---|---|
| `/new` | Archive current session, start fresh |
| `/extend [N]` | Extend session by N turns (default: turnLimit) |
| `/model [opus\|sonnet\|haiku\|default]` | Show or change model for current session |
| `/session list` | List all sessions with turn usage |
| `/session info` | Show current session details |
| `/session resume <name>` | Resume a session by name |
| `/session rename <name>` | Rename current session |
| `/session pin <name> <slot>` | Pin a session to quick-switch slot (1-3) |
| `/s` | Show pinned sessions as inline keyboard buttons |
| `/help` | Show all commands |

Any other text is forwarded to the coding agent in the current session.

## Sessions

Sessions resume automatically until you start a new one with `/new`.

When turns reach the configured `turnLimit`, the bot pauses and asks you to `/extend` or `/new`.

Session names are auto-generated from the first message (e.g. `fix-bug-4821`, max 20 chars). Override the model per-session with `/model opus` — persists until reset or new session.

Pin your most-used sessions for quick switching:

```
/session pin fix-bug-4821 1
/session pin api-work-7392 2
/s                              ← tap a button to switch
```

Sessions persist across restarts in `~/.assurgent/state/sessions.json`.

## Secret Proxy

Assurgent includes a local proxy server that injects secrets into outgoing requests — so the AI agent never sees raw credentials.

The proxy binds to `127.0.0.1` only, enforces a whitelist, and resolves `${{secretRef.*}}` handlebars in headers, query params, and request body before forwarding. The `x-assurgent-upstream` header is stripped and never forwarded to the upstream server.

The whitelist supports two entry formats:
- **Domain only** (e.g. `"googleapis.com"`) -- matches by hostname.
- **Host:port** (e.g. `"127.0.0.1:3000"`) -- matches by hostname and port. Useful for local services.

### How it works

1. Configure secrets and proxy in `config.json`:

```json
{
  "secrets": {
    "providers": {
      "my-env": { "type": "env" }
    },
    "entries": {
      "apiKey": { "provider": "my-env", "key": "MY_API_KEY" }
    }
  },
  "proxy": {
    "port": 9090,
    "whitelist": ["googleapis.com", "graph.microsoft.com", "127.0.0.1:3000"]
  }
}
```

2. Set env vars (e.g. in `.env`):

```bash
MY_API_KEY=sk-your-real-key
```

3. Tell the AI agent to use the proxy by setting the `x-assurgent-upstream` header:

```
When calling Google Calendar, use http://127.0.0.1:9090 as the base URL
and set the header x-assurgent-upstream: https://googleapis.com

When calling Microsoft Graph, use http://127.0.0.1:9090 as the base URL
and set the header x-assurgent-upstream: https://graph.microsoft.com
```

Example request the agent would make:

```
GET http://127.0.0.1:9090/calendar/v3/events
x-assurgent-upstream: https://googleapis.com
Authorization: Bearer ${{secretRef.apiKey}}
```

The proxy resolves handlebars, combines the upstream header with the request path, and forwards to `https://googleapis.com/calendar/v3/events`. Auth headers are stripped from responses.

### Using secrets without the proxy

You can also use secret references directly in config values without enabling the proxy:

```json
{
  "secrets": {
    "providers": {
      "my-env": { "type": "env" },
      "vault": { "type": "azure-keyvault", "vaultUrl": "https://my-vault.vault.azure.net" }
    },
    "entries": {
      "botToken": { "provider": "vault", "key": "telegram-bot-token" }
    }
  },
  "chat": {
    "telegram": {
      "botToken": "${{secretRef.botToken}}"
    }
  }
}
```

Each provider has a user-chosen name (e.g. `"vault"`, `"my-env"`) and a `type` field (`"azure-keyvault"` or `"env"`). You can have multiple instances of the same type -- for example, separate Key Vaults for production and staging. Secrets are resolved once at startup from the configured provider.

## Security Recommendations

The coding agent (Claude Code) runs as a child process with filesystem and shell access. To reduce secret exposure:

**Run assurgent as a non-root user.** Set service principal credentials (e.g. `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`) as system-level env vars owned by root or a dedicated service account. If the agent runs as a non-root user, it cannot read `/etc/environment` or root-owned systemd service configs.

**Use `security.blacklistEnv`** to strip sensitive env vars from the agent's child process:

```json
{
  "security": {
    "blacklistEnv": ["AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "AZURE_TENANT_ID"]
  }
}
```

**Prefer Azure Key Vault over env vars** for production. Env vars are convenient for development, but Key Vault provides access control, audit logging, and rotation. The agent never sees the vault credentials — assurgent resolves secrets at startup and only exposes them through the proxy.

**Use the proxy whitelist** to limit which upstream servers receive your secrets. Even if the agent is tricked via prompt injection, secrets only flow to whitelisted domains.

## Config Reference

| Field | Description |
|---|---|
| **Secrets** | |
| `secrets.providers.<name>` | Named provider instance with `type` discriminator |
| `secrets.providers.<name>.type` | Provider type: `"env"` or `"azure-keyvault"` |
| `secrets.providers.<name>.vaultUrl` | Azure Key Vault URL (when type is `"azure-keyvault"`) |
| `secrets.entries.<name>` | Named secret: `{ "provider": "<instance-name>", "key": "..." }` |
| **Security** | |
| `security.blacklistEnv` | Array of env var names to strip from child processes |
| **Chat** | |
| `chat.adapter` | Chat platform (`"telegram"`) |
| `chat.telegram.botToken` | Telegram bot token (supports `${{secretRef.*}}`) |
| `chat.telegram.allowedUserIds` | Array of allowed Telegram user IDs |
| `chat.telegram.placeholder.enabled` | Show placeholder while agent thinks |
| `chat.telegram.placeholder.text` | Placeholder text (default: `"thinking..."`) |
| **Agent** | |
| `agent.adapter` | Agent backend (`"claude-code"`) |
| `agent.claude-code.model` | Default model (`"opus"`, `"sonnet"`, `"haiku"`) |
| `agent.claude-code.maxTurns` | Max agent turns per invocation |
| `agent.claude-code.flags` | Extra CLI flags |
| `agent.claude-code.claudePath` | Path to `claude` binary (default: `"claude"`) |
| **Session** | |
| `session.turnLimit` | Pause after N turns, ask to extend or start new |
| **Proxy** | |
| `proxy.port` | Local proxy port (binds to 127.0.0.1) |
| `proxy.whitelist` | Allowed upstream targets: domain names (e.g. `"googleapis.com"`) or host:port (e.g. `"127.0.0.1:3000"`) |
| `proxy.bypassWhitelist` | Skip whitelist enforcement (default: `false`) |
| **General** | |
| `workspacePath` | Absolute path to workspace for Claude Code |

## Development

```bash
git clone https://github.com/thaitype/assurgent.git
cd assurgent
bun install
```

```bash
bun run dev            # Start with --watch
bun run typecheck      # tsc --noEmit
bun test               # Run tests
bun run lint           # Biome check
bun run lint:fix       # Auto-fix
```

For local development, config is read from `~/.assurgent/config.json` (same as production). Use `ASSURGENT_HOME` to point to a dev-specific config.

### Architecture

```
ChatAdapter (e.g. Telegram) → Wrapper Core → AgentAdapter (e.g. Claude Code CLI)
                                    │
                              Session Manager
```

Both sides are pluggable interfaces. Adding a new chat platform or coding agent is just implementing an adapter — no changes to the core.

### Claude Code Agent Setup

This project includes Claude Code skills (`.claude/skills/`) for common workflows like releasing. If you want the agent to self-edit skills, add this to `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Edit(.claude/skills/**)",
      "Write(.claude/skills/**)",
      "Update(.claude/skills/**)",
      "Create(.claude/skills/**)"
    ]
  }
}
```

## License

MIT
