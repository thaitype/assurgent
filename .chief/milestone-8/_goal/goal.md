# Milestone 8: Session Quick-Switch UI in Telegram

## Objective

Add a `/s` command that displays an inline keyboard with pinned session buttons, enabling quick session switching without typing session names.

Re-key the session system from name-based keys to locally generated UUIDs so that session names can be renamed without breaking references.

## Design Decisions

### Quick-Switch UI

1. **`/s` command** shows inline keyboard with pinned session buttons.
2. **`/session pin <name> <slot>`** assigns a session to a quick-switch slot (1-3). Replaces any existing assignment in that slot.
3. **Tapping a button** triggers the same logic as `/session resume <name>` and sends "Resumed session: <name>".
4. **Session name max 20 chars**, truncated silently. Auto-generated format changed from `YYYY-MM-DD-<slug>` to `<topic>-<4 random digits>` (e.g. `fix-bug-4821`).
5. **No short alias** for pin command.
6. **Auto-remove slot** if pinned session no longer exists (checked when `/s` is invoked).
7. **Active session marked** with a single marker on its button (e.g. `> fix-bug-4821`).
8. **If no sessions pinned**, `/s` sends: "No pinned sessions. Use `/session pin <name> <slot>` to pin one."
9. **`/session resume <name>`** stays for ad-hoc switching to any session.
10. Pin slots stored in session state (sessions.json).

### Session Re-Keying (name -> local UUID)

11. **`id`** — locally generated UUID (crypto.randomUUID) at session creation. Permanent, never changes. This is the internal session key used everywhere in state.
12. **`name`** — human-friendly display label. Renameable. Used only in user-facing commands and UI.
13. **`agentSessionId`** — Claude Code's session ID. Used only when calling the agent for conversation continuity. Not our key.
14. **`sessions`** keyed by `id` (was keyed by `name`). `Record<id, Session>`.
15. **`activeSession`** stores `id` (was `name`). `Record<chatId, id>`.
16. **`pinnedSessions`** stores `id` (was `name`). `Record<chatId, Record<slot, id>>`.
17. **Lookup by name** — commands like `/session resume <name>` scan sessions to find matching name. Small list, linear scan acceptable.
18. **Callback data** — inline keyboard buttons store `pin:<id>` (UUID is 36 chars, prefix 4 chars = 40 chars, within 64-byte limit).
19. **Breaking change** — existing sessions.json files will not be migrated. Users reset state. Acceptable pre-1.0.
20. **No backward compatibility** layer needed.

## Telegram Implementation Details

- Use grammY's `InlineKeyboard` for buttons.
- Use `bot.callbackQuery` to handle button taps.
- Callback data has 64-byte limit -- `pin:<uuid>` = 40 chars, fits.
- Buttons displayed in a single row.

## Scope

### In scope

- Re-key session storage from name-based to UUID-based keys
- Add `id` field to Session interface
- Update all internal references (activeSession, pinnedSessions, callback data) to use `id`
- Update user-facing commands to resolve name -> id via scan
- New `/s` command with inline keyboard
- New `/session pin <name> <slot>` subcommand
- Pin slot storage in session state
- Session name format change (max 20 chars, `<topic>-<4 random digits>`)
- Active session marker on buttons
- Auto-cleanup of stale pins
- Callback query handler for button taps
- ChatAdapter interface extension for inline keyboard and callback queries

### Out of scope

- Multi-row button layouts
- Customizable slot count (fixed at 3)
- Pinning via button UI (pin command is text-only)
- Unpin command (overwrite the slot or let auto-cleanup handle it)
- Migration of existing sessions.json (breaking change, pre-1.0)
