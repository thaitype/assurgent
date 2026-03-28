# Config File Schema

## Location

- `app/config.json` -- actual config (gitignored, contains secrets)
- `app/config.example.json` -- committed template

## Example config.json

```json
{
  "chat": {
    "adapter": "telegram",
    "telegram": {
      "botToken": "123456:ABC-DEF...",
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
      "flags": ["--dangerously-skip-permissions"]
    }
  },
  "session": {
    "turnLimit": 20
  },
  "workspacePath": "/path/to/your/workspace"
}
```

## Validation Rules

- `chat.adapter` must be `"telegram"`
- `chat.telegram.botToken` must be a non-empty string
- `chat.telegram.allowedUserIds` must have at least one entry
- `agent.adapter` must be `"claude-code"`
- `session.turnLimit` must be a positive number
- `workspacePath` must be an absolute path

## Session State Location

Session state is persisted at: `state/sessions.json`

This follows the assurgent convention where `state/` holds operational data.
