# Task 1: SecretProvider Interface + Multi-Provider Resolver + Env Provider

## Objective

Implement the core secret resolution infrastructure: the `SecretProvider` interface, the multi-provider resolver that walks the config tree and replaces `${{secretRef.*}}` handlebars, and the `env` provider.

## Scope

**Included:**
- `src/secrets/provider.ts` -- `SecretProvider` interface
- `src/secrets/resolver.ts` -- `resolveSecrets()` function, `createProviders()` factory
- `src/secrets/env.ts` -- `EnvProvider` class
- Unit tests for resolver and env provider

**Excluded:**
- Azure Key Vault adapter (task-2)
- Config loader changes (task-3)
- Proxy (task-5)

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md`
- `.chief/_rules/_verification/verification.md`
- `.chief/milestone-5/_contract/secret-provider.md`
- `.chief/milestone-5/_contract/config-secret-ref.md`

## Steps

1. Create `src/secrets/provider.ts` with the `SecretProvider` interface.
2. Create `src/secrets/env.ts` implementing `EnvProvider` -- reads `process.env`, throws if var not set.
3. Create `src/secrets/resolver.ts` with:
   - `resolveSecrets(config, providers, entries)` -- recursive tree walker
   - `createProviders(providerConfigs)` -- factory that instantiates providers by name
   - Register `env` provider in the factory (Key Vault added in task-2).
4. Write unit tests for resolver (mock providers) and env provider.

## Acceptance Criteria

- `SecretProvider` interface matches the contract exactly.
- `resolveSecrets()` handles: full replacement, partial string interpolation, multiple handlebars in one string, nested objects/arrays, non-string passthrough.
- Unknown secret name throws with config path in error message.
- Unknown provider in entry throws with clear error.
- `EnvProvider` resolves from `process.env` and throws if var is not set.
- `createProviders()` throws for unknown provider names.

## Verification

```bash
cd app && bun test src/secrets/
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- `src/secrets/provider.ts`
- `src/secrets/resolver.ts`
- `src/secrets/env.ts`
- `src/secrets/resolver.test.ts`
- `src/secrets/env.test.ts`
