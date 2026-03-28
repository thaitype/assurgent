# Task 4: Unit Tests for Milestone 3 Changes

## Objective

Add or update unit tests covering the new functionality introduced in tasks 1-3.

## Scope

**Files to modify/create:**
- `src/core/session-manager.test.ts` (update existing or create)
- `src/agent/claude-code.test.ts` (update existing or create)
- `src/core/wrapper.test.ts` (update existing or create)

## Rules & Contracts

- `.chief/_rules/_standard/typescript.md` (test conventions)
- `.chief/_rules/_verification/verification.md`

## Steps

1. **session-manager tests:**
   - Test `extendSession` uses `override.turnLimit` (not flat `turnLimitOverride`)
   - Test `setModelOverride` sets model on active session
   - Test `setModelOverride` clears model when passed `undefined`
   - Test `setModelOverride` returns false when no active session

2. **claude-code tests:**
   - Test `SUPPORTED_MODELS` export contains expected values
   - Test `buildArgs` passes model from options when provided
   - Verify `env` config in invoke (if testable without spawning process)

3. **wrapper tests (if existing test infrastructure supports it):**
   - Test `/model` command handler with valid/invalid/default/no-args inputs
   - Test `/session list` format includes turns/limit/percentage
   - Test `/session rename` rejects empty name

## Acceptance Criteria

- All new tests pass: `bun test`
- Tests cover the session override refactor, model command, and AGENT_SESSION_ID
- No existing tests broken

## Verification

```bash
cd app && bun test
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- Updated/created test files
