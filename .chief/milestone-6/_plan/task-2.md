# Task 2: Update package.json for npm Publishing

## Objective

Update `package.json` so the package is publishable to npm as `assurgent` with the correct `bin`, `files`, and `publishConfig` fields.

## Scope

**Included:**
- `package.json` field additions/changes

**Excluded:**
- Creating cli.ts (task-1)
- Actual publishing (task-3 verification)

## Rules & Contracts to Follow

- `.chief/milestone-6/_contract/package-publish.md`
- `.chief/_rules/_verification/verification.md`

## Steps

1. Change `name` from `assurgent-app` to `assurgent`.
2. Add `bin` field: `{ "assurgent": "./cli.ts" }`.
3. Add `files` array: `["cli.ts", "src/**/*", "config.example.json", "README.md"]`. This controls what npm includes in the tarball. Test files (`*.test.ts`) are excluded by npm when they are not matched by the `files` glob, but add an explicit `.npmignore` or verify with dry-run if needed.
4. Add `publishConfig`: `{ "access": "public" }`.
5. Preserve all existing fields (`scripts`, `dependencies`, `devDependencies`, `version`, `type`).
6. Verify existing checks still pass.

## Acceptance Criteria

- `name` is `assurgent`.
- `bin.assurgent` is `./cli.ts`.
- `files` array includes only runtime files.
- `publishConfig.access` is `"public"`.
- All existing scripts, deps, and devDeps are unchanged.
- `bun install` still works.
- `bun run typecheck` passes.
- `bun run lint` passes.

## Verification

```bash
bun install
bun run typecheck
bun run lint
```

## Deliverables

- Updated `package.json`
