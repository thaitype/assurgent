# Goal: Multi-Provider Secret Support

## Summary

Redesign the secrets config so that provider instances have **user-chosen names** with a `type` field as discriminator. This allows multiple instances of the same provider type (e.g., two Azure Key Vaults for prod and staging).

## Motivation

The current design uses the provider type name as the instance key, so only one instance per type is possible. Real deployments need secrets from multiple vaults or multiple env scopes.

## Key Design Decisions

1. **Clean break** -- no backward compatibility with old config format where provider name = type.
2. **User-chosen instance names** with `type` field as discriminator.
3. Multiple instances of the same provider type allowed.
4. `env` provider treated the same as others -- user-chosen name, no special cases.
5. All validation failures hard fail at startup (unknown type, missing type, duplicate name, referencing non-existent provider).
6. Loose TypeScript typing for provider config: `{ type: string; [key: string]: unknown }` with runtime validation.
7. Provider names restricted to `[a-zA-Z0-9_-]` only, validated at startup.

## Example Config

```json
{
  "secrets": {
    "providers": {
      "vault-prod": { "type": "azure-keyvault", "vaultUrl": "https://prod.vault.azure.net" },
      "vault-staging": { "type": "azure-keyvault", "vaultUrl": "https://staging.vault.azure.net" },
      "my-env": { "type": "env" }
    },
    "entries": {
      "prodToken": { "provider": "vault-prod", "key": "token" },
      "stagingToken": { "provider": "vault-staging", "key": "token" },
      "localKey": { "provider": "my-env", "key": "LOCAL_API_KEY" }
    }
  }
}
```

## Out of Scope

- No new provider types (only azure-keyvault and env).
- No changes to handlebar syntax (`${{secretRef.*}}`).
- No changes to proxy routing or other subsystems.
