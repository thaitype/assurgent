# Milestone 8: Session Quick-Switch UI in Telegram

## Objective

Add a `/s` command that displays an inline keyboard with pinned session buttons, enabling quick session switching without typing session names.

## Design Decisions

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

## Telegram Implementation Details

- Use grammY's `InlineKeyboard` for buttons.
- Use `bot.callbackQuery` to handle button taps.
- Callback data has 64-byte limit -- keep callback format short (e.g. `pin:<session-name>`).
- Buttons displayed in a single row.

## Scope

### In scope

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
