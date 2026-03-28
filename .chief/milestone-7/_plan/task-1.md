# Task 1: Add getAssurgentHome() and Update loadConfig()

## Objective

Introduce a `getAssurgentHome()` helper and change `loadConfig()` to resolve config from `ASSURGENT_HOME` instead of the current working directory.

## Scope

**Included:**
- `src/config.ts`

**Excluded:**
- `src/index.ts` changes (task-2)
- `cli.ts` changes (task-3)
- Tests (task-4)

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md`
- `.chief/milestone-7/_contract/config-resolution.md`

## Steps

1. Add `import os from "node:os"` to `src/config.ts`.
2. Add exported `getAssurgentHome()` function that returns `process.env.ASSURGENT_HOME ?? path.join(os.homedir(), ".assurgent")`.
3. Change `loadConfig()` fallback from `path.resolve(import.meta.dir, "..", "config.json")` to `path.join(getAssurgentHome(), "config.json")`.
4. Update the "not found" error message to say: `Config file not found: <path>\nRun "assurgent init" to create one, or set ASSURGENT_HOME to point to an existing config directory.`

## Acceptance Criteria

- `getAssurgentHome()` is exported from `src/config.ts`.
- `loadConfig()` with no args resolves to `$ASSURGENT_HOME/config.json` if env is set, otherwise `~/.assurgent/config.json`.
- `loadConfig(explicitPath)` still uses the explicit path.
- Error message on missing config mentions both `assurgent init` and `ASSURGENT_HOME`.
- No changes to `validateConfig()` or the `Config` interface.

## Verification

```bash
bun run typecheck
bun run lint
```

## Deliverables

- Modified `src/config.ts`
