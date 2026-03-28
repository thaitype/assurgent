# Task 3: Add `assurgent init` Subcommand and Update CLI Help

## Objective

Add the `assurgent init` subcommand to `cli.ts` that scaffolds `config.json` into `$ASSURGENT_HOME/`. Update the help text to reflect the new config model (remove `.env` references).

## Scope

**Included:**
- `cli.ts`
- `package.json` (remove `--env-file` from dev script if present)

**Excluded:**
- `src/config.ts` (task-1)
- `src/index.ts` (task-2)
- `config.example.json` (no changes needed, it ships as-is)

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md`
- `.chief/milestone-7/_contract/config-resolution.md`

## Steps

1. Add `init` subcommand handling in `cli.ts` before the default `import("./src/index.ts")` path.
2. When `args[0] === "init"`:
   a. Import `getAssurgentHome` from `./src/config.ts`.
   b. Resolve target path: `path.join(getAssurgentHome(), "config.json")`.
   c. If target exists: print refusal message and `process.exit(1)`.
   d. If target does not exist:
      - Create the directory with `mkdirSync(dirname(target), { recursive: true })`.
      - Copy `config.example.json` from `path.join(import.meta.dirname, "config.example.json")`.
      - Print success message and `process.exit(0)`.
3. Update the `--help` text:
   - Add `assurgent init` to usage section.
   - Remove references to `.env` and cwd-based config.
   - Mention `ASSURGENT_HOME` and `~/.assurgent/`.
4. Ensure `config.example.json` is in the `files` array of `package.json` (it must be bundled for `init` to work).
5. Remove `--env-file .env` from the `dev` script in `package.json` if present.

## Acceptance Criteria

- `bun cli.ts init` creates `~/.assurgent/config.json` (or `$ASSURGENT_HOME/config.json`) from the bundled template.
- `bun cli.ts init` when config exists prints refusal and exits 1.
- `bun cli.ts --help` shows `init` subcommand and mentions `ASSURGENT_HOME`.
- `bun cli.ts --help` does NOT mention `.env`.
- `config.example.json` is listed in `package.json` `files` array.
- `dev` script does not use `--env-file`.

## Verification

```bash
bun run typecheck
bun run lint
bun cli.ts --help
```

Note: actual `init` execution creates files in the home directory. Manual or tester-agent verification.

## Deliverables

- Modified `cli.ts`
- Modified `package.json`
