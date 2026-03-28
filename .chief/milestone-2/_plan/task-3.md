# Task 3: Implement Session Manager with Tests

## Objective

Create the session manager that maps friendly session names to agent session IDs, tracks turn counts, and persists state to disk.

## Scope

- Create `app/src/core/session-manager.ts`
- Create `app/src/core/session-manager.test.ts`

## Rules & Contracts to Follow

- `.chief/milestone-2/_contract/interfaces.md` -- Session and SessionState types
- `.chief/_rules/_standard/typescript.md` -- coding standards

## Steps

1. Create `src/core/session-manager.ts` with:
   - `Session` and `SessionState` interfaces per contract
   - `generateSessionName(message: string): string` -- generates `YYYY-MM-DD-<slug>` from first message. Slug: first ~30 chars, lowercase, non-alphanumeric (except Thai characters) replaced with hyphens
   - `SessionManager` class with constructor taking `{ statePath: string }`
   - Methods: `resolveSession`, `updateSession`, `extendSession`, `archiveActive`, `listSessions`, `setActive`, `renameActive`, `getActive`
   - State file: `sessions.json` inside the configured statePath
   - Lazy load from disk on first access, auto-create directory on save
2. Create `src/core/session-manager.test.ts` testing:
   - `generateSessionName` produces correct format
   - `generateSessionName` handles Thai text
   - `generateSessionName` handles empty/whitespace input
   - `resolveSession` creates new session when none active
   - `resolveSession` returns existing active session
   - `archiveActive` clears active pointer
   - `extendSession` increases turn limit
   - `renameActive` updates session name and mappings
   - `listSessions` returns sorted by lastMessageAt

## Acceptance Criteria

- All SessionManager methods work correctly
- State persists to and loads from `sessions.json`
- Session names are human-readable slugs with date prefix
- All tests pass
- Type check and lint pass

## Verification

```bash
cd app && bun run typecheck && bun test && bun run lint
```

## Deliverables

- `app/src/core/session-manager.ts`
- `app/src/core/session-manager.test.ts`
