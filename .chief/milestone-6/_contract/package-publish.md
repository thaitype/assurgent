# Package Publish Contract

## package.json Required Fields

The existing `package.json` must be updated (not replaced) with these fields:

```jsonc
{
  "name": "assurgent",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "assurgent": "./cli.ts"
  },
  "files": [
    "cli.ts",
    "src/**/*",
    "config.example.json",
    "README.md"
  ],
  "publishConfig": {
    "access": "public"
  }
}
```

### Rules

- The `name` field changes from `assurgent-app` to `assurgent`.
- The `bin` field points to `cli.ts` at the package root.
- The `files` array must NOT include: `node_modules`, `.chief`, `*.test.ts`, `.env`, `config.json`, `state/`, `biome.json`.
- Existing `scripts`, `dependencies`, and `devDependencies` must be preserved.

## cli.ts Contract

```typescript
#!/usr/bin/env bun
// Entry point for `bunx assurgent`
```

- Must have the Bun shebang as the first line.
- Must import and run the existing boot logic from `src/index.ts`.
- Must handle `--help` and `--version` flags with basic output.
- Must NOT duplicate logic already in `src/index.ts`.

## Files Array Verification

Before any publish, verify with:

```bash
bun publish --dry-run
```

The output must contain only runtime-necessary files.
