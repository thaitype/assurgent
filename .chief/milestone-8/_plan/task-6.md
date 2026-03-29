# Task 6: Update Wrapper command handlers to use UUID-based session lookups

## Objective

Update `src/core/wrapper.ts` so that all session-related command handlers (e.g. `/session list`, `/session resume <name>`, `/session new`, `/session rename`) work with the new UUID-keyed session system.

## Scope

- `src/core/wrapper.ts` only.
- Commands that reference sessions by name must now resolve name -> id via `findSessionByName`.
- Display output continues to show session `name` to users (not the UUID).

## Rules & Contracts

- `.chief/milestone-8/_contract/contract.md` — affected method signatures.
- `.chief/_rules/_standard/typescript.md`

## Steps

1. Update `/session resume <name>` handler to call `findSessionByName(name, chatId)` then use `session.id`.
2. Update `/session list` to display `name` from each session (id is internal).
3. Update `/session new` — session creation already returns session with id, ensure active session set by id.
4. Update `/session rename` — find by name, update name field, re-save (session stays at same id key).
5. Update any other session commands that reference sessions by name.
6. Ensure `resolveSession` call in message handling works with id-based state.

## Acceptance Criteria

- All session commands resolve names to ids internally.
- User-facing output shows names, never raw UUIDs.
- Type checks pass.

## Verification

```bash
cd app && bun run typecheck
```

## Deliverables

- Updated `src/core/wrapper.ts`
