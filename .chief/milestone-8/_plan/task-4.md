# Task 4: Unit Tests for Milestone 8 Features

## Objective

Write unit tests for the new session name generation, pin management, and stale pin removal.

## Scope

- Tests for `generateSessionName` new format
- Tests for `pinSession`, `getPins`, `removeStalePins`
- Tests for session name truncation (max 20 chars)

## Rules & Contracts

- `/Users/thada/gits/thaitype/assurgent/.chief/_rules/_standard/typescript.md`
- `/Users/thada/gits/thaitype/assurgent/.chief/_rules/_verification/verification.md`

## Steps

1. Add or update test file `src/core/session-manager.test.ts`.
2. Test `generateSessionName`:
   - Output matches `<slug>-<4digits>` pattern.
   - Total length <= 20 chars.
   - Empty/whitespace input falls back to `session-XXXX`.
3. Test `pinSession`:
   - Returns true for valid session + slot.
   - Returns false for non-existent session.
   - Overwrites existing slot assignment.
4. Test `getPins`:
   - Returns empty object for chat with no pins.
   - Returns correct pins after pinning.
5. Test `removeStalePins`:
   - Removes pins referencing deleted sessions.
   - Keeps pins referencing existing sessions.

## Acceptance Criteria

- All new tests pass.
- Existing tests still pass.
- Tests cover edge cases (empty message, long message, invalid slot).

## Verification

```bash
cd app && bun test
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- New or updated `src/core/session-manager.test.ts`
