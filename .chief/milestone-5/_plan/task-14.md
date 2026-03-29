# Task 14: Update tests for multi-provider createProviders and resolver

## Objective

Update existing tests and add new tests for the multi-provider `createProviders` with `type` discriminator. Update resolver tests that use the old provider name format.

## Scope

- **Included:** `src/secrets/resolver.test.ts`, `src/secrets/env.test.ts`
- **Excluded:** Source implementation (done in task-13), config.ts

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md` (test conventions)
- `.chief/_rules/_verification/verification.md`
- `.chief/milestone-5/_contract/secret-provider.md`
- `.chief/milestone-5/_goal/multi-provider.md`

## Steps

1. In `resolver.test.ts`, update the `makeProviders` helper -- providers in tests use mock providers with instance names (not type names). The mock providers do not go through `createProviders`, so existing `resolveSecrets` tests just need their provider map keys updated if they reference provider by instance name.
2. Add a new `describe("createProviders")` block with tests:
   - Valid multi-provider config with two azure-keyvault instances and one env.
   - Missing `type` field throws.
   - Invalid provider name (e.g., `"bad name!"`) throws.
   - Unknown `type` value throws.
   - Empty providers object succeeds (returns empty map).
3. Ensure all existing resolver tests still pass (they use mock providers directly, so should be unaffected).

## Acceptance Criteria

- `bun test` passes with all existing + new tests.
- New tests cover: name validation, type validation, unknown type, multiple instances of same type.

## Verification

```bash
bun test
bun run typecheck
bun run lint
```

## Deliverables

- Updated `src/secrets/resolver.test.ts`
