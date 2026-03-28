# Task 2: Update Session State Path and index.ts

## Objective

Change the session state directory from `workspacePath/state/` to `$ASSURGENT_HOME/state/`, and update `src/index.ts` accordingly.

## Scope

**Included:**
- `src/index.ts`

**Excluded:**
- `src/core/session-manager.ts` (no changes needed -- it already accepts `statePath` via constructor)
- `src/config.ts` (task-1)
- `cli.ts` (task-3)

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md`
- `.chief/milestone-7/_contract/config-resolution.md`

## Steps

1. In `src/index.ts`, import `getAssurgentHome` from `./config`.
2. Change the `SessionManager` instantiation from:
   ```typescript
   statePath: path.join(config.workspacePath, "state")
   ```
   to:
   ```typescript
   statePath: path.join(getAssurgentHome(), "state")
   ```

## Acceptance Criteria

- `SessionManager` receives `$ASSURGENT_HOME/state` as its `statePath`.
- No other behavioral changes in `src/index.ts`.
- `workspacePath` is still used only for `ClaudeCodeAdapter`.

## Verification

```bash
bun run typecheck
bun run lint
```

## Deliverables

- Modified `src/index.ts`
