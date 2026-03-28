# Milestone 6: Publish to npm for `bunx assurgent`

## Objective

Make `assurgent` installable and runnable via `bunx assurgent` by publishing to the npm registry. Users with Bun installed can run the CLI with zero local setup beyond a `config.json` and `.env`.

## Key Requirements

1. **npm-publishable package.json** -- name `assurgent`, `bin` field pointing to a CLI entry point, correct `files` array, `publishConfig.access: "public"`.
2. **CLI entry point** -- a `cli.ts` file with `#!/usr/bin/env bun` shebang that boots the existing `src/index.ts` logic.
3. **No build step** -- Bun runs `.ts` natively, so no compilation required. The shebang handles execution.
4. **Minimal published footprint** -- only include files needed at runtime (`cli.ts`, `src/**/*`, `package.json`, config example). Exclude tests, `.chief/`, dev tooling.
5. **Dry-run verification** -- `bun publish --dry-run` must show only intended files before any real publish.

## Non-Goals

- Node.js compatibility (no JS build output). Users must have Bun.
- Automated CI/CD publish pipeline (future milestone).
- CLI argument parsing framework (keep it simple for now).

## Target User Experience

```bash
bunx assurgent          # runs the bot
bunx assurgent --help   # shows basic usage info
```

The user provides their own `config.json` and `.env` in the working directory.
