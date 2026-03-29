# Task 15: Update Config type, loadConfig, and config.example.json for new provider format

## Objective

Update the `Config` interface's `secrets.providers` type to reflect `{ type: string; [key: string]: unknown }` shape. Update `config.example.json` to use the new format with user-chosen instance names.

## Scope

- **Included:** `src/config.ts`, `config.example.json`
- **Excluded:** resolver.ts (done in task-13), tests

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md`
- `.chief/_rules/_verification/verification.md`
- `.chief/milestone-5/_contract/config-secret-ref.md` (updated Multi-Provider section)
- `.chief/milestone-5/_goal/multi-provider.md`

## Steps

1. In `src/config.ts`, update the `secrets.providers` type from `Record<string, unknown>` to `Record<string, { type: string; [key: string]: unknown }>`.
2. Update `config.example.json`:
   - Change `"azure-keyvault": { "vaultUrl": "..." }` to `"vault": { "type": "azure-keyvault", "vaultUrl": "..." }`.
   - Change `"env": {}` to `"my-env": { "type": "env" }`.
   - Update entries to reference new provider instance names.
3. Verify `loadConfig` still works correctly with the new types (the flow itself does not change, just the type constraint is tighter).

## Acceptance Criteria

- `Config.secrets.providers` typed as `Record<string, { type: string; [key: string]: unknown }>`.
- `config.example.json` uses new format with user-chosen names and `type` field.
- `bun run typecheck` passes.

## Verification

```bash
bun run typecheck
bun run lint
```

## Deliverables

- Updated `src/config.ts`
- Updated `config.example.json`
