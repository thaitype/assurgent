# SecretProvider Interface Contract

## Purpose

Define a pluggable interface for resolving `${{secretRef.*}}` handlebars in config strings at startup. The config loader scans all string values, finds handlebars, calls the appropriate provider for each entry, and replaces them with actual secret values before the app starts.

This is an interface contract. It defines the shape, not the implementation.

---

## SecretProvider Interface

```typescript
/**
 * A provider that can resolve secret names to their actual values.
 * Each provider handles one source (Key Vault, env vars, file, etc).
 */
export interface SecretProvider {
  /** Unique name for this provider (e.g., "azure-keyvault", "env"). */
  readonly name: string;

  /**
   * Resolve a single secret key to its value.
   * Throws if the secret cannot be found or access is denied.
   */
  resolve(key: string): Promise<string>;

  /**
   * Optional: resolve multiple keys in one batch.
   * Default implementation calls resolve() in a loop.
   * Providers can override for efficiency (e.g., batch Key Vault calls).
   */
  resolveMany?(keys: string[]): Promise<Map<string, string>>;

  /**
   * Optional: clean up resources (close connections, etc).
   */
  dispose?(): Promise<void>;
}
```

---

## Handlebar Syntax

Any string value in config.json can contain one or more handlebars:

```
${{secretRef.<name>}}
```

- `<name>` must match a key in `secrets.entries`.
- The entries map resolves the name to a provider + provider-specific secret key.

### Examples

| Config value | After resolution |
|---|---|
| `"${{secretRef.telegramBotToken}}"` | `"123456:ABC-DEF..."` |
| `"Bearer ${{secretRef.apiToken}}"` | `"Bearer eyJhbG..."` |
| `"plain string"` | `"plain string"` (no change) |

---

## Multi-Provider Config Resolver

The resolver runs between "load JSON" and "validate config." It instantiates one provider per entry in `secrets.providers` and routes each secret to the correct provider.

### Flow

```
config.json (raw)
    |
    v
JSON.parse() --> raw object with handlebar strings
    |
    v
createProviders(raw.secrets.providers) --> Map<name, SecretProvider>
    |
    v
resolveSecrets(raw, providers, entries) --> all handlebars replaced with values
    |
    v
validateConfig(resolved) --> typed Config object
    |
    v
dispose all providers
    |
    v
app starts
```

### Resolver Function Signature

```typescript
/**
 * Walk the config tree. Replace every ${{secretRef.*}} handlebar with
 * the resolved secret value. Routes each entry to its designated provider.
 * Returns a new object (does not mutate input).
 */
export async function resolveSecrets(
  config: unknown,
  providers: Map<string, SecretProvider>,
  entries: Record<string, { provider: string; key: string }>
): Promise<unknown>;
```

### Resolver Rules

1. Walk recursively through all object properties and array elements.
2. If a value is a string containing `${{secretRef.<name>}}`, resolve it.
3. Look up `name` in the entries map to get `{ provider, key }`.
4. Look up the provider instance from the providers map.
5. Call `provider.resolve(key)` and replace the handlebar with the returned value.
6. If `name` is not in entries, throw with a clear error.
7. If the entry's `provider` is not in the providers map, throw with a clear error.
8. If `resolve()` throws, propagate the error with context (which config path failed).
9. Multiple handlebars in one string are all resolved (string interpolation).
10. Non-string values pass through unchanged.
11. The resolver returns a new object -- it does not mutate the input.

---

## Azure Key Vault Adapter

```typescript
export interface AzureKeyVaultProviderConfig {
  /** Key Vault URL, e.g. "https://my-vault.vault.azure.net" */
  vaultUrl: string;
}

/**
 * Resolves secrets from Azure Key Vault.
 * Uses DefaultAzureCredential (picks up env vars, managed identity, CLI auth, etc).
 */
export class AzureKeyVaultProvider implements SecretProvider {
  readonly name = "azure-keyvault";

  constructor(config: AzureKeyVaultProviderConfig);

  async resolve(key: string): Promise<string>;

  async dispose(): Promise<void>;
}
```

Dependencies:
- `@azure/keyvault-secrets`
- `@azure/identity`

The adapter uses `key` directly as the Key Vault secret name.

### Retry on Failure

Key Vault calls retry **3 times** with exponential backoff:

| Attempt | Delay before retry |
|---|---|
| 1st failure | 2 seconds |
| 2nd failure | 4 seconds |
| 3rd failure | 8 seconds, then crash |

After all retries exhausted, the process **crashes** with a clear error message including the secret key and underlying error. Do not silently fall back or continue with missing secrets.

---

## Env Provider

```typescript
/**
 * Resolves secrets from process.env.
 * No config needed -- reads environment variables directly.
 */
export class EnvProvider implements SecretProvider {
  readonly name = "env";

  async resolve(key: string): Promise<string>;
}
```

- `key` is the environment variable name (e.g., `"DEV_TOKEN"`).
- If the env var is not set, throw: `Environment variable "DEV_TOKEN" is not set.`
- No retry logic needed for env provider.
- `.env` file support is handled by Bun's `--env-file` flag, not by custom parsing. The env provider just reads `process.env`.

---

## Provider Registration (Multi-Provider)

Providers are created based on the `secrets.providers` config block. Each entry maps to its own provider.

```typescript
// In loadConfig:
const raw = JSON.parse(configFile);

if (raw.secrets) {
  const providers = createProviders(raw.secrets.providers);
  const resolved = await resolveSecrets(raw, providers, raw.secrets.entries);
  const config = resolved as Config;
  validateConfig(config);
  for (const provider of providers.values()) {
    await provider.dispose?.();
  }
  return config;
}

// No secrets block -- plain config, no resolution needed
return validateConfig(raw);
```

`loadConfig` is **always async** regardless of whether secrets exist.

### `createProviders` factory

```typescript
function createProviders(
  providerConfigs: Record<string, unknown>
): Map<string, SecretProvider> {
  const map = new Map<string, SecretProvider>();
  for (const [name, config] of Object.entries(providerConfigs)) {
    switch (name) {
      case "azure-keyvault":
        map.set(name, new AzureKeyVaultProvider(config as AzureKeyVaultProviderConfig));
        break;
      case "env":
        map.set(name, new EnvProvider());
        break;
      default:
        throw new Error(`Unknown secret provider: "${name}"`);
    }
  }
  return map;
}
```

---

## Error Handling

| Condition | Behavior |
|---|---|
| Unknown entry name | Throw: `Unknown secret name "foo" in handlebar at config path: chat.telegram.botToken. Not found in secrets.entries.` |
| Unknown provider in entry | Throw: `Secret "foo" references provider "xyz" which is not defined in secrets.providers.` |
| Secret not found in vault | Throw: `Secret "telegram-bot-token" not found in azure-keyvault. Referenced at config path: chat.telegram.botToken` |
| Auth failure (Key Vault) | Retry 3 times with backoff (2s/4s/8s), then crash: `Failed to authenticate to Azure Key Vault after 3 retries: <underlying error>` |
| Env var not set | Throw: `Environment variable "DEV_TOKEN" is not set. Referenced at config path: agent.claude-code.devToken` |
| No secrets config | Throw: `Found ${{secretRef.*}} in config but no "secrets" block is defined.` |

All errors must include the config path so the user knows which field failed.
