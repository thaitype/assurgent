# Task 2: Azure Key Vault Adapter with Retry Logic

## Objective

Implement the Azure Key Vault secret provider with retry-on-failure (3 retries, exponential backoff 2s/4s/8s, then crash).

## Scope

**Included:**
- `src/secrets/azure-keyvault.ts` -- `AzureKeyVaultProvider` class
- Retry logic (3 attempts, 2s/4s/8s backoff)
- Register `azure-keyvault` in `createProviders()` factory (in `resolver.ts`)
- Unit tests with mocked Azure SDK

**Excluded:**
- Real Azure Key Vault integration testing (tester-agent scope)

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md`
- `.chief/_rules/_verification/verification.md`
- `.chief/milestone-5/_contract/secret-provider.md` (retry spec)

## Steps

1. Install `@azure/keyvault-secrets` and `@azure/identity` as dependencies.
2. Create `src/secrets/azure-keyvault.ts`:
   - Constructor takes `{ vaultUrl: string }`.
   - Uses `DefaultAzureCredential` and `SecretClient`.
   - `resolve(key)` calls `client.getSecret(key)` with retry wrapper.
   - `dispose()` -- cleanup if needed.
3. Implement retry helper: 3 attempts, delays [2000, 4000, 8000] ms. On final failure, throw (process will crash).
4. Register `azure-keyvault` in `createProviders()` factory.
5. Write unit tests with mocked `SecretClient`.

## Acceptance Criteria

- `AzureKeyVaultProvider` implements `SecretProvider` interface.
- Retry logic: 3 retries with 2s/4s/8s backoff. After 3rd failure, throws (crash).
- Error messages include secret key and underlying error.
- Factory creates `AzureKeyVaultProvider` when `"azure-keyvault"` is in providers config.

## Verification

```bash
cd app && bun test src/secrets/
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- `src/secrets/azure-keyvault.ts`
- `src/secrets/azure-keyvault.test.ts`
- Updated `src/secrets/resolver.ts` (factory registration)
- Updated `package.json` (new dependencies)
