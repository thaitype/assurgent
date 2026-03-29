# Task 5: Re-key Session interface and SessionManager internals

## Objective

Change the session system from name-based keys to UUID-based keys. The `Session` interface gains an `id` field, and all internal maps (`sessions`, `activeSession`, `pinnedSessions`) store `id` instead of `name`.

## Scope

- `src/core/session-manager.ts` only.
- No changes to Wrapper or ChatAdapter in this task.

## Rules & Contracts

- `.chief/milestone-8/_contract/contract.md` — Session, SessionState interfaces and method signatures.
- `.chief/_rules/_standard/typescript.md`

## Steps

1. Add `id: string` field to `Session` interface.
2. Change `SessionState.sessions` key from name to id.
3. Change `SessionState.activeSession` value from name to id.
4. Change `SessionState.pinnedSessions` slot values from name to id.
5. Change `PinSlots` doc comment from "session name" to "session id".
6. Update `resolveSession` to generate `id` via `crypto.randomUUID()` when creating new sessions, and look up active session by id.
7. Add `findSessionByName(name: string, chatId: string): Session | undefined` — linear scan of sessions matching name and chatId.
8. Update `getSession` (or rename to `getSessionById`) to look up by id.
9. Update `listSessions`, `resumeSession`, `createSession`, `pinSession`, `getPinnedSessions` to use id-based lookups.
10. Update `save()` / `load()` — no format migration, just read/write the new shape.

## Acceptance Criteria

- `Session` has `id` field.
- All state maps use id as key/value.
- `findSessionByName` exists and works.
- `crypto.randomUUID()` called at session creation.
- Type checks pass: `bun run typecheck`.

## Verification

```bash
cd app && bun run typecheck
```

## Deliverables

- Updated `src/core/session-manager.ts`
