# Milestone 8: Contracts

## Pin Storage Format

Added to `SessionState` in `session-manager.ts`:

```typescript
export interface SessionState {
  sessions: Record<string, Session>;
  activeSession: Record<string, string>;
  /** Per-chat pin slots. Key = chatId, value = slot map. */
  pinnedSessions: Record<string, PinSlots>;
}

/** Maps slot number (1-3) to session name. */
export type PinSlots = Record<string, string>;
```

Example persisted state in `sessions.json`:

```json
{
  "sessions": { ... },
  "activeSession": { "123": "fix-bug-4821" },
  "pinnedSessions": {
    "123": {
      "1": "fix-bug-4821",
      "2": "refactor-api-9032"
    }
  }
}
```

## Session Name Rules

- Max length: 20 characters.
- Auto-generated format: `<slug>-<4 random digits>` (e.g. `fix-bug-4821`).
- Slug derived from first message, truncated to fit within 20 chars including the `-XXXX` suffix (so slug max = 15 chars).
- Names provided by user via `/session rename` or `/session pin` are silently truncated to 20 chars.

## Callback Data Format

- Format: `pin:<session-name>`
- Max 64 bytes (Telegram limit). Session name max 20 chars, prefix `pin:` is 4 chars = 24 chars max, well within limit.
- Example: `pin:fix-bug-4821`

## ChatAdapter Interface Changes

New methods added to `ChatAdapter`:

```typescript
export interface ChatAdapter {
  // ... existing methods ...

  /** Send an inline keyboard with buttons. Returns undefined if not supported. */
  sendInlineKeyboard(
    chatId: string,
    text: string,
    buttons: Array<{ label: string; callbackData: string }>,
  ): Promise<void>;

  /** Register a handler for inline keyboard callback queries. */
  onCallbackQuery(handler: (chatId: string, data: string) => Promise<void>): void;
}
```

## Command Contracts

### `/s`

- Reads pinned sessions for the chat.
- Removes any pins whose session no longer exists.
- If no pins remain, sends text: "No pinned sessions. Use `/session pin <name> <slot>` to pin one."
- Otherwise, builds inline keyboard with up to 3 buttons in a single row, ordered by slot number.
- Active session button prefixed with `> ` marker.

### `/session pin <name> <slot>`

- `slot` must be 1, 2, or 3. Otherwise reply with usage message.
- `name` must match an existing session for this chat. Otherwise reply "Session not found."
- Assigns the session to the slot, replacing any previous assignment.
- Replies: "Pinned <name> to slot <slot>."

## Existing Method Changes

### `generateSessionName`

- Change from `YYYY-MM-DD-<slug>` to `<slug>-<4 random digits>`.
- Truncate total name to 20 characters.
