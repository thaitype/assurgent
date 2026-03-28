# assurgent Chat Wrapper

A lightweight wrapper that connects chat (e.g. **Telegram**) to Agent (e.g. **Claude Code CLI**), so you can talk to Claude from your phone — with your entire assurgent workspace as context.

> Experimental project, early alpha. Expect bugs and breaking changes, use at your own risk.

```
You (Telegram) --> Wrapper --> Claude Code CLI --> Response --> You (Telegram)
```

It is not an agent itself. It's a bridge between Telegram and the Claude Code CLI, with automatic session management.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))

### Install

```bash
cd app
bun install
```

### Configure

```bash
cp config.example.json config.json
```

Edit `config.json`:

```json
{
  "chat": {
    "adapter": "telegram",
    "telegram": {
      "botToken": "YOUR_BOT_TOKEN_HERE",
      "allowedUserIds": ["YOUR_TELEGRAM_USER_ID"],
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
      "flags": ["--dangerously-skip-permissions"],
      "claudePath": "claude"
    }
  },
  "session": {
    "turnLimit": 20
  },
  "workspacePath": "/path/to/assurgent"
}
```

To find your Telegram user ID, message [@userinfobot](https://t.me/userinfobot).

> **Note:** If `claude` is not in your shell's PATH (common on servers where PATH is set in `.bashrc`), set `claudePath` to the full path, e.g. `/home/user/.local/bin/claude`.

### Run

```bash
bun run dev
```

Then message your bot on Telegram.

## Bot Commands

| Command                                 | Description                                    |
| --------------------------------------- | ---------------------------------------------- |
| `/new`                                  | Archive current session, start fresh           |
| `/extend [N]`                           | Extend session by N turns (default: turnLimit) |
| `/model [opus\|sonnet\|haiku\|default]` | Show or change model for current session       |
| `/session list`                         | List all sessions with turn usage              |
| `/session info`                         | Show current session details                   |
| `/session resume <name>`                | Resume a session by name                       |
| `/session rename <name>`                | Rename current session                         |
| `/help`                                 | Show all commands                              |

Any other text message is forwarded to Claude Code in the current session.

## Sessions

Sessions always resume the active session until you explicitly start a new one with `/new`.

When the turn count reaches the configured `turnLimit` (default: 20), the bot pauses and asks you to decide:
- `/extend 20` to add more turns and keep the same session
- `/new` to archive and start fresh

Session names are auto-generated from the date and first message (e.g. `2026-03-27-fix-bug`).

You can override the model per-session with `/model sonnet` — this persists until you reset with `/model default` or start a new session.

Sessions persist across restarts via `state/sessions.json` (relative to `workspacePath`).

## Config Reference

| Field                               | Description                                                 |
| ----------------------------------- | ----------------------------------------------------------- |
| `chat.adapter`                      | Chat platform (`"telegram"`)                                |
| `chat.telegram.botToken`            | Telegram bot token                                          |
| `chat.telegram.allowedUserIds`      | Array of allowed Telegram user IDs                          |
| `chat.telegram.placeholder.enabled` | Show a placeholder message while agent thinks               |
| `chat.telegram.placeholder.text`    | Placeholder text                                            |
| `agent.adapter`                     | Agent CLI (`"claude-code"`)                                 |
| `agent.claude-code.model`           | Default model (e.g. `"opus"`, `"sonnet"`)                   |
| `agent.claude-code.maxTurns`        | Max agent turns per invocation                              |
| `agent.claude-code.flags`           | Extra CLI flags (e.g. `["--dangerously-skip-permissions"]`) |
| `agent.claude-code.claudePath`      | Path to `claude` binary (default: `"claude"`)               |
| `session.turnLimit`                 | Pause session after N turns, ask user to /extend or /new    |
| `workspacePath`                     | Absolute path to the assurgent repo root                     |

## Environment Variables Passed to Agent

The wrapper sets these env vars on every Claude Code invocation:

| Variable           | Description                                          |
| ------------------ | ---------------------------------------------------- |
| `AGENT_SESSION_ID` | The Claude Code session UUID for the current session |

## Development

```bash
bun install            # Install dependencies
bun run dev            # Run the wrapper
bun run typecheck      # Type check (tsc --noEmit)
bun test               # Run tests
bun run lint           # Lint (biome)
bun run lint:fix       # Auto-fix lint issues
```

## Architecture

```
ChatAdapter (Telegram) --> Wrapper Core --> AgentAdapter (Claude Code CLI)
                              |
                        Session Manager
                       (name <-> UUID)
```

Both the chat side and agent side are pluggable interfaces. The design supports adding other chat platforms or agent backends later without touching the core.

### Directory Structure

```
app/
├── src/
│   ├── index.ts             # Entry point
│   ├── config.ts            # Config loader + validation
│   ├── core/
│   │   ├── wrapper.ts       # Core orchestrator
│   │   └── session-manager.ts
│   ├── interfaces/
│   │   ├── chat-adapter.ts
│   │   └── agent-adapter.ts
│   ├── chat/
│   │   └── telegram.ts      # Telegram adapter (grammy)
│   └── agent/
│       └── claude-code.ts   # Claude Code adapter (execa)
├── config.json              # Runtime config (gitignored)
├── config.example.json      # Committed template
├── package.json
├── tsconfig.json
└── biome.json
```
