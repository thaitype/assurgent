# Task 4: Add/Update Tests for Config Resolution and Init Logic

## Objective

Write unit tests covering the new `getAssurgentHome()` behavior and the updated `loadConfig()` resolution logic.

## Scope

**Included:**
- `src/config.test.ts`

**Excluded:**
- Integration testing of `assurgent init` (tester-agent scope)
- Changes to source files

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md`
- `.chief/_rules/_verification/verification.md`
- `.chief/milestone-7/_contract/config-resolution.md`

## Steps

1. Open or create `src/config.test.ts`.
2. Update existing tests if they rely on old cwd-based config resolution.
3. Add tests for `getAssurgentHome()`:
   - Returns `~/.assurgent` when `ASSURGENT_HOME` is not set.
   - Returns the env var value when `ASSURGENT_HOME` is set.
4. Add tests for `loadConfig()`:
   - Uses explicit `configPath` when provided.
   - Throws with helpful message (mentioning `assurgent init` and `ASSURGENT_HOME`) when config is missing.
5. Ensure all existing tests still pass.

## Acceptance Criteria

- `bun test` passes with all new and existing tests green.
- Tests cover both env-var-set and env-var-unset paths for `getAssurgentHome()`.
- Tests verify the error message content when config is missing.

## Verification

```bash
bun test
bun run typecheck
bun run lint
```

## Deliverables

- Modified or created `src/config.test.ts`
