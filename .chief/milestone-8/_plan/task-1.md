# Task 1: Update SessionManager -- Name Generation and Pin Storage

## Objective

Change auto-generated session name format and add pin slot management to `SessionManager`.

## Scope

- Modify `generateSessionName` in `src/core/session-manager.ts`
- Add `pinnedSessions` field to `SessionState` interface
- Add `PinSlots` type
- Add methods: `pinSession`, `getPins`, `removeStalePins`

## Rules & Contracts

- `/Users/thada/gits/thaitype/assurgent/.chief/_rules/_standard/typescript.md`
- `/Users/thada/gits/thaitype/assurgent/.chief/_rules/_verification/verification.md`
- `/Users/thada/gits/thaitype/assurgent/.chief/milestone-8/_contract/contract.md`

## Steps

1. Change `generateSessionName` from `YYYY-MM-DD-<slug>` to `<slug>-<4 random digits>`. Slug max 15 chars, total max 20 chars.
2. Add `pinnedSessions: Record<string, PinSlots>` to `SessionState` (default `{}`).
3. Add `PinSlots` type export: `Record<string, string>` (slot number string to session name).
4. Add `pinSession(chatId: string, name: string, slot: number): boolean` -- validates session exists and slot is 1-3, assigns pin, saves. Returns false if session not found.
5. Add `getPins(chatId: string): PinSlots` -- returns pin slots for a chat.
6. Add `removeStalePins(chatId: string): void` -- removes pins that reference non-existent sessions, saves.
7. Ensure `load()` initializes `pinnedSessions` to `{}` if missing from file (backward compat).

## Acceptance Criteria

- `generateSessionName("fix the bug")` returns something like `fix-the-bug-4821` (20 chars max).
- `pinnedSessions` is persisted in sessions.json.
- `pinSession` returns false for non-existent sessions.
- `removeStalePins` cleans up references to deleted sessions.
- Backward compatible: old sessions.json without `pinnedSessions` loads without error.

## Verification

```bash
cd app && bun run typecheck
cd app && bun run lint
cd app && bun test
```

## Deliverables

- Modified `src/core/session-manager.ts`
