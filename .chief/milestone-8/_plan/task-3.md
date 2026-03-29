# Task 3: Add /s Command, /session pin, and Callback Handler to Wrapper

## Objective

Wire up the quick-switch UI in the Wrapper: `/s` command, `/session pin` subcommand, and callback query handler for button taps.

## Scope

- Add `/s` command handler in `Wrapper.start()`
- Add `pin` case to `handleSessionCommand`
- Register callback query handler for `pin:` prefix
- Update `/help` text

## Rules & Contracts

- `/Users/thada/gits/thaitype/assurgent/.chief/_rules/_standard/typescript.md`
- `/Users/thada/gits/thaitype/assurgent/.chief/_rules/_verification/verification.md`
- `/Users/thada/gits/thaitype/assurgent/.chief/milestone-8/_contract/contract.md`

## Steps

1. In `Wrapper.start()`, register `/s` command:
   - Call `sessions.removeStalePins(chatId)`.
   - Call `sessions.getPins(chatId)`.
   - If empty, send "No pinned sessions. Use `/session pin <name> <slot>` to pin one."
   - Otherwise, build button array sorted by slot number. For the active session, prefix label with `> `.
   - Call `chat.sendInlineKeyboard(chatId, "Quick switch:", buttons)`.

2. In `Wrapper.start()`, register callback query handler via `chat.onCallbackQuery`:
   - Parse data: if starts with `pin:`, extract session name.
   - Call `sessions.setActive(chatId, name)` and `pausedChats.delete(chatId)`.
   - Send "Resumed session: <name>" or "Session not found." via `chat.sendText`.

3. Add `pin` case to `handleSessionCommand`:
   - Parse `args` as `pin <name> <slot>`.
   - Validate slot is 1, 2, or 3.
   - Call `sessions.pinSession(chatId, name, slot)`.
   - Reply accordingly.

4. Update `/help` command to include `/s` and `/session pin`.

## Acceptance Criteria

- `/s` displays inline keyboard with pinned sessions.
- `/s` with no pins shows the "no pinned sessions" message.
- Tapping a button resumes the session.
- `/session pin myname 1` pins the session.
- `/session pin nonexistent 1` replies with error.
- `/help` lists the new commands.
- Active session is marked with `> ` in button label.

## Verification

```bash
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- Modified `src/core/wrapper.ts`
