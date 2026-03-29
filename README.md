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
| `/help` | Show all commands |

Any other text is forwarded to the coding agent in the current session.

## Sessions

Sessions resume automatically until you start a new one with `/new`.

When turns reach the configured `turnLimit`, the bot pauses and asks you to `/extend` or `/new`.

Session names are auto-generated from the date and first message (e.g. `2026-03-27-fix-bug`). Override the model per-session with `/model opus` — persists until reset or new session.

Sessions persist across restarts in `~/.assurgent/state/sessions.json`.

## Secret Proxy

Assurgent includes a local proxy server that injects secrets into outgoing requests — so the AI agent never sees raw credentials.

The proxy binds to `127.0.0.1` only, enforces a URL whitelist, and resolves `${{secretRef.*}}` handlebars in headers, query params, and request body before forwarding.

### How it works

1. Configure secrets and proxy in `config.json`:

```json
{
  "secrets": {
    "providers": { "env": {} },
    "entries": {
      "apiKey": { "provider": "env", "key": "MY_API_KEY" }
    }
  },
  "proxy": {
    "port": 9090,
    "whitelist": ["googleapis.com/**", "graph.microsoft.com/**"]
  }
}
```

2. Set env vars (e.g. in `.env`):

```bash
MY_API_KEY=sk-your-real-key
```

3. Tell the AI agent to route requests through the proxy:

```
Use http://127.0.0.1:9090/googleapis.com/calendar/v3/... instead of calling the Google Calendar API directly.
When calling Microsoft Graph, use http://127.0.0.1:9090/graph.microsoft.com/v1.0/... as the base URL.
All external API requests should go through http://127.0.0.1:9090/<target-host>/...
```

The agent sends requests to the proxy, which resolves secrets and forwards them to the real API. Auth headers are stripped from responses.

### Using secrets without the proxy

You can also use secret references directly in config values without enabling the proxy:

```json
{
  "secrets": {
    "providers": {
      "env": {},
      "azure-keyvault": { "vaultUrl": "https://my-vault.vault.azure.net" }
    },
    "entries": {
      "botToken": { "provider": "azure-keyvault", "key": "telegram-bot-token" }
    }
  },
  "chat": {
    "telegram": {
      "botToken": "${{secretRef.botToken}}"
    }
  }
}
```

Secrets are resolved once at startup from the configured provider.

## Config Reference

| Field | Description |
|---|---|
| **Secrets** | |
| `secrets.providers` | Secret provider configs (`"env"`, `"azure-keyvault"`) |
| `secrets.providers.env` | Reads from `process.env` (no config needed) |
| `secrets.providers.azure-keyvault.vaultUrl` | Azure Key Vault URL |
| `secrets.entries.<name>` | Named secret: `{ "provider": "...", "key": "..." }` |
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
| `proxy.whitelist` | Glob patterns for allowed upstream URLs |
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
