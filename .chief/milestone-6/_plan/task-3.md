# Task 3: Verify Publish Contents with Dry-Run

## Objective

Run `bun publish --dry-run` and verify that only intended files are included in the npm tarball. Fix any exclusion issues found.

## Scope

**Included:**
- Running dry-run and inspecting output
- Adding `.npmignore` if needed to exclude unwanted files
- Documenting the final file list in the task report

**Excluded:**
- Actual publishing to npm (human decision)

## Rules & Contracts to Follow

- `.chief/milestone-6/_contract/package-publish.md`
- `.chief/_rules/_verification/verification.md`

## Steps

1. Run `bun publish --dry-run` and capture the file list.
2. Verify the tarball contains ONLY:
   - `package.json`
   - `cli.ts`
   - `src/**/*` (excluding `*.test.ts`)
   - `config.example.json`
   - `README.md`
3. Verify the tarball does NOT contain:
   - `.chief/`
   - `node_modules/`
   - `*.test.ts`
   - `.env`
   - `config.json`
   - `state/`
   - `biome.json`
   - `tsconfig.json`
   - `bun.lock`
4. If unwanted files are present, add `.npmignore` or adjust the `files` array.
5. Write the verified file list to `.chief/milestone-6/_report/task-3/dry-run-output.md`.

## Acceptance Criteria

- `bun publish --dry-run` exits 0.
- Only intended runtime files are in the tarball.
- No dev/build/config/test files leak into the published package.
- Report file documents the final verified list.

## Verification

```bash
bun publish --dry-run
```

## Deliverables

- `.npmignore` (if needed)
- `.chief/milestone-6/_report/task-3/dry-run-output.md`
