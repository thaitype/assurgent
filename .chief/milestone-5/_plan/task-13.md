# Task 13: Refactor createProviders to support user-chosen instance names with type discriminator

## Objective

Update `createProviders` in `src/secrets/resolver.ts` to use `type` field as discriminator instead of using the provider key as the type. Add provider name validation.

## Scope

- **Included:** `src/secrets/resolver.ts` (the `createProviders` function)
- **Excluded:** Tests (separate task), config.ts, config.example.json

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md`
- `.chief/_rules/_verification/verification.md`
- `.chief/milestone-5/_contract/secret-provider.md` (updated Provider Registration section)
- `.chief/milestone-5/_goal/multi-provider.md`

## Steps

1. Add a `PROVIDER_NAME_RE = /^[a-zA-Z0-9_-]+$/` constant in `resolver.ts`.
2. Update `createProviders` function signature to accept `Record<string, { type: string; [key: string]: unknown }>`.
3. Validate each provider instance name against `PROVIDER_NAME_RE`. Throw descriptive error on failure.
4. Validate that each provider config has a `type` field (string). Throw if missing.
5. Switch on `config.type` instead of `name` for provider instantiation.
6. Use `instanceName` (the key) as the map key, not the type.
7. Remove backward compatibility with old format (clean break).

## Acceptance Criteria

- `createProviders({ "vault-prod": { type: "azure-keyvault", vaultUrl: "..." }, "my-env": { type: "env" } })` returns a Map with keys `"vault-prod"` and `"my-env"`.
- `createProviders({ "vault-prod": { type: "azure-keyvault", vaultUrl: "..." }, "vault-staging": { type: "azure-keyvault", vaultUrl: "..." } })` succeeds (multiple instances of same type).
- `createProviders({ "bad name!": { type: "env" } })` throws with name validation error.
- `createProviders({ "foo": {} })` throws about missing `type` field.
- `createProviders({ "foo": { type: "unknown" } })` throws about unknown type.

## Verification

```bash
bun run typecheck
bun run lint
```

(Tests are updated in task-14.)

## Deliverables

- Updated `src/secrets/resolver.ts`
