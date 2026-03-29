# Milestone 8: Contracts

## Session Interface

```typescript
export interface Session {
  /** Locally generated UUID. Permanent key, never changes. */
  id: string;
  /** Human-friendly display label. Renameable. */
  name: string;
  /** Claude Code's session ID for conversation continuity. */
  agentSessionId: string;
  chatId: string;
  createdAt: string;
  lastMessageAt: string;
  turnCount: number;
  override?: {
    turnLimit?: number;
    model?: string;
  };
}
```

## SessionState Interface

All maps that previously stored session names now store session `id` (UUID).

```typescript
export interface SessionState {
  /** Key = session id (UUID). Was keyed by name. */
  sessions: Record<string, Session>;
  /** Key = chatId, value = session id (UUID). Was session name. */
  activeSession: Record<string, string>;
  /** Key = chatId, value = slot map (slot -> session id). Was session name. */
  pinnedSessions: Record<string, PinSlots>;
}

/** Maps slot number (1-3) to session id (UUID). */
export type PinSlots = Record<string, string>;
```

## Persisted State Example

```json
{
  "sessions": {
    "a1b2c3d4-5678-9abc-def0-111111111111": {
      "id": "a1b2c3d4-5678-9abc-def0-111111111111",
      "name": "fix-bug-4821",
      "agentSessionId": "b63744df-aaaa-bbbb-cccc-dddddddddddd",
      "chatId": "6562752036",
      "createdAt": "2026-03-28T10:00:00Z",
      "lastMessageAt": "2026-03-28T10:05:00Z",
      "turnCount": 3
    }
  },
  "activeSession": {
    "6562752036": "a1b2c3d4-5678-9abc-def0-111111111111"
  },
  "pinnedSessions": {
    "6562752036": {
      "1": "a1b2c3d4-5678-9abc-def0-111111111111",
      "2": "e5f6a7b8-1234-5678-9abc-222222222222"
    }
  }
}
```

## Session Name Rules

- Max length: 20 characters.
- Auto-generated format: `<slug>-<4 random digits>` (e.g. `fix-bug-4821`).
- Slug derived from first message, truncated to fit within 20 chars including the `-XXXX` suffix (so slug max = 15 chars).
- Names provided by user via `/session rename` or `/session pin` are silently truncated to 20 chars.

## Session ID Rules

- Generated via `crypto.randomUUID()` at session creation time.
- Never changes after creation.
- Used as the key in `sessions`, `activeSession`, and `pinnedSessions`.
- Stored in the `id` field of `Session`.

## Callback Data Format

- Format: `pin:<session-id>` where session-id is a UUID.
- UUID = 36 chars + prefix `pin:` = 40 chars. Within 64-byte Telegram limit.
- Example: `pin:a1b2c3d4-5678-9abc-def0-111111111111`

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

## Affected SessionManager Methods

### `resolveSession(chatId, message)`

- Creates session with `id: crypto.randomUUID()` and stores under `sessions[id]`.
- Sets `activeSession[chatId] = id`.

### `getSession(name)` -> `getSessionById(id)` and `findSessionByName(name, chatId)`

- `getSessionById(id)`: direct lookup in `sessions[id]`.
- `findSessionByName(name, chatId)`: scans sessions for matching name and chatId. Returns Session or undefined.

### `listSessions(chatId)`

- No signature change. Returns sessions filtered by chatId. Each session now has `id` field.

### `resumeSession(chatId, name)` -> internal: resolve name to id, then set activeSession

- Accepts name (user-facing). Calls `findSessionByName` to get `id`. Sets `activeSession[chatId] = id`.

### `createSession(chatId, message)`

- Generates `id` via `crypto.randomUUID()`.
- Generates `name` via `generateSessionName(message)`.
- Stores session under `sessions[id]`.

### Pin-related methods

- `pinSession(chatId, name, slot)`: resolves name to id, stores `pinnedSessions[chatId][slot] = id`.
- `getPinnedSessions(chatId)`: returns pin slots with ids. Caller resolves ids to sessions for display.

## Command Contracts

### `/s`

- Reads pinned sessions for the chat (ids from pinnedSessions).
- Resolves each id to session. Removes any pins whose session no longer exists.
- If no pins remain, sends text: "No pinned sessions. Use `/session pin <name> <slot>` to pin one."
- Otherwise, builds inline keyboard with up to 3 buttons in a single row, ordered by slot number.
- Button label = session name. Active session button prefixed with `> ` marker.
- Callback data = `pin:<session-id>`.

### `/session pin <name> <slot>`

- `slot` must be 1, 2, or 3. Otherwise reply with usage message.
- `name` must match an existing session for this chat (via name scan). Otherwise reply "Session not found."
- Assigns the session id to the slot, replacing any previous assignment.
- Replies: "Pinned <name> to slot <slot>."

### Callback query handler (`pin:<id>`)

- Extracts id from callback data.
- Looks up session by id. If not found, responds with error.
- Sets as active session. Responds: "Resumed session: <name>".

## Existing Method Changes

### `generateSessionName`

- Change from `YYYY-MM-DD-<slug>` to `<slug>-<4 random digits>`.
- Truncate total name to 20 characters.
- (Already implemented in milestone-8 task-1.)

## Breaking Change

- Existing `sessions.json` files are incompatible with the new format (name-keyed vs id-keyed).
- No migration. Users must delete `state/sessions.json` to reset.
- Acceptable: project is pre-1.0.
