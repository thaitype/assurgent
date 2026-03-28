# Task 1: Project Scaffolding

## Objective

Set up the foundational project files so that `bun install`, `bun run typecheck`, `bun run lint`, and `bun test` all work from the `app/` directory.

## Scope

- Create `app/package.json` with dependencies and scripts
- Create `app/tsconfig.json` with strict TypeScript config
- Create `app/biome.json` with linter/formatter config
- Create `app/.gitignore` (node_modules, dist, config.json)
- Create `app/config.example.json` (committed template)
- Create `app/src/` directory with a minimal `index.ts` placeholder

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md` -- TypeScript config requirements
- `.chief/_rules/_verification/verification.md` -- verification commands
- `.chief/milestone-2/_contract/config-schema.md` -- config.example.json format

## Steps

1. Create `package.json` with:
   - name: `assurgent-app`
   - type: `module`
   - dependencies: `grammy`, `execa`
   - devDependencies: `@biomejs/biome`, `@types/bun`, `typescript`
   - scripts: `dev`, `typecheck`, `test`, `lint`, `lint:fix`
2. Create `tsconfig.json` matching the reference (strict, ESNext, Bun types, noEmit)
3. Create `biome.json` matching the reference (recommended rules, space indent, double quotes)
4. Create `.gitignore` with: `node_modules`, `dist`, `config.json`, `bun.lock`
5. Create `config.example.json` per the config-schema contract
6. Create `src/index.ts` with a simple `console.log("assurgent-app")` placeholder
7. Run `bun install`

## Acceptance Criteria

- `bun install` succeeds
- `bun run typecheck` exits 0
- `bun run lint` exits 0
- `bun test` exits 0 (no tests yet, but runner works)
- `config.example.json` matches the contract schema
- `config.json` is gitignored

## Verification

```bash
cd app && bun install && bun run typecheck && bun run lint
```

## Deliverables

- `app/package.json`
- `app/tsconfig.json`
- `app/biome.json`
- `app/.gitignore`
- `app/config.example.json`
- `app/src/index.ts`
