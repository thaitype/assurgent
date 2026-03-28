# Task 1: Create cli.ts Entry Point

## Objective

Create a `cli.ts` file at the package root that serves as the executable entry point for `bunx assurgent`. It must have a Bun shebang and delegate to the existing boot logic.

## Scope

**Included:**
- `cli.ts` at package root (same level as `package.json`)

**Excluded:**
- Changes to `src/index.ts` (unless minor refactor needed to make it importable from cli.ts)
- package.json changes (task-2)

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md`
- `.chief/milestone-6/_contract/package-publish.md`

## Steps

1. Create `cli.ts` at the package root with `#!/usr/bin/env bun` as the first line.
2. Add `--help` flag handling: print a short usage message and exit.
3. Add `--version` flag handling: read version from `package.json` and print it.
4. For normal execution (no flags), import and run the existing `src/index.ts` entry point.
5. Ensure the file is executable (`chmod +x cli.ts`).

## Acceptance Criteria

- `cli.ts` exists at the package root.
- First line is exactly `#!/usr/bin/env bun`.
- `bun cli.ts --help` prints usage and exits 0.
- `bun cli.ts --version` prints the version and exits 0.
- `bun cli.ts` (with no flags) runs the normal bot startup path.
- No logic from `src/index.ts` is duplicated.

## Verification

```bash
bun run typecheck
bun run lint
bun cli.ts --help
bun cli.ts --version
```

Note: full bot startup (`bun cli.ts` with no flags) requires config/env and is not verified in builder checks. Tester-agent handles that.

## Deliverables

- `cli.ts`
