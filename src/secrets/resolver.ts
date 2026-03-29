import type { AzureKeyVaultProviderConfig } from "./azure-keyvault";
import { HANDLEBAR_RE } from "./constants";
import { EnvProvider } from "./env";
import type { SecretProvider } from "./provider";

/** Entry in the secrets.entries config map. */
export interface SecretEntry {
  provider: string;
  key: string;
}

/**
 * Walk the config tree. Replace every ${{secretRef.*}} handlebar with
 * the resolved secret value. Routes each entry to its designated provider.
 * Returns a new object (does not mutate input).
 */
export async function resolveSecrets(
  config: unknown,
  providers: Map<string, SecretProvider>,
  entries: Record<string, SecretEntry>,
  currentPath = "",
): Promise<unknown> {
  if (typeof config === "string") {
    return resolveString(config, providers, entries, currentPath);
  }

  if (Array.isArray(config)) {
    const result: unknown[] = [];
    for (let i = 0; i < config.length; i++) {
      result.push(await resolveSecrets(config[i], providers, entries, `${currentPath}[${i}]`));
    }
    return result;
  }

  if (config !== null && typeof config === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      const childPath = currentPath ? `${currentPath}.${key}` : key;
      result[key] = await resolveSecrets(value, providers, entries, childPath);
    }
    return result;
  }

  // Non-string primitives pass through unchanged
  return config;
}

/** Resolve all handlebars in a single string value. */
async function resolveString(
  value: string,
  providers: Map<string, SecretProvider>,
  entries: Record<string, SecretEntry>,
  configPath: string,
): Promise<string> {
  const matches = [...value.matchAll(HANDLEBAR_RE)];
  if (matches.length === 0) {
    return value;
  }

  let resolved = value;
  for (const match of matches) {
    const fullMatch = match[0];
    const secretName = match[1];

    const entry = entries[secretName];
    if (!entry) {
      throw new Error(
        `Unknown secret name "${secretName}" in handlebar at config path: ${configPath}. Not found in secrets.entries.`,
      );
    }

    const provider = providers.get(entry.provider);
    if (!provider) {
      throw new Error(
        `Secret "${secretName}" references provider "${entry.provider}" which is not defined in secrets.providers.`,
      );
    }

    const secretValue = await provider.resolve(entry.key);
    resolved = resolved.replace(fullMatch, secretValue);
  }

  return resolved;
}

/**
 * Walk the config tree and substitute ${{secretRef.<name>}} handlebars using
 * a pre-resolved secrets map. No provider calls are made -- values come from
 * the map directly. Returns a new object (does not mutate input).
 *
 * Throws if a handlebar references a name not present in the map.
 */
export function substituteSecrets(
  config: unknown,
  resolvedSecrets: Record<string, string>,
  currentPath = "",
): unknown {
  if (typeof config === "string") {
    return substituteString(config, resolvedSecrets, currentPath);
  }

  if (Array.isArray(config)) {
    return config.map((item, i) =>
      substituteSecrets(item, resolvedSecrets, `${currentPath}[${i}]`),
    );
  }

  if (config !== null && typeof config === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      const childPath = currentPath ? `${currentPath}.${key}` : key;
      result[key] = substituteSecrets(value, resolvedSecrets, childPath);
    }
    return result;
  }

  return config;
}

/** Replace all handlebars in a single string using the resolved map. */
function substituteString(
  value: string,
  resolvedSecrets: Record<string, string>,
  configPath: string,
): string {
  const matches = [...value.matchAll(HANDLEBAR_RE)];
  if (matches.length === 0) {
    return value;
  }

  let resolved = value;
  for (const match of matches) {
    const fullMatch = match[0];
    const secretName = match[1];

    if (!(secretName in resolvedSecrets)) {
      throw new Error(
        `Unknown secret name "${secretName}" in handlebar at config path: ${configPath}. Not found in resolved secrets.`,
      );
    }

    resolved = resolved.replace(fullMatch, resolvedSecrets[secretName]);
  }

  return resolved;
}

/**
 * Scan all string values in a config object for ${{secretRef.*}} patterns.
 * Returns true if any handlebars are found.
 */
export function hasSecretRefs(config: unknown): boolean {
  if (typeof config === "string") {
    // Use a fresh regex to avoid lastIndex issues with the global flag
    return /\$\{\{secretRef\.(\w+)\}\}/.test(config);
  }

  if (Array.isArray(config)) {
    return config.some((item) => hasSecretRefs(item));
  }

  if (config !== null && typeof config === "object") {
    return Object.values(config).some((value) => hasSecretRefs(value));
  }

  return false;
}

/**
 * Verify no unresolved ${{secretRef.*}} patterns remain after resolution.
 * Throws if any are found.
 */
export function assertNoUnresolvedRefs(config: unknown): void {
  // Reset regex lastIndex since it's global
  if (hasSecretRefs(config)) {
    throw new Error(
      "Config contains unresolved ${{secretRef.*}} patterns after secret resolution. This indicates a resolution bug.",
    );
  }
}

/**
 * Create provider instances from the secrets.providers config block.
 * Each key maps to a provider type. Unknown providers throw immediately.
 *
 * Azure Key Vault provider is loaded lazily via dynamic `import()` so
 * `@azure/identity` and `@azure/keyvault-secrets` are only pulled in
 * when actually configured.
 */
export async function createProviders(
  providerConfigs: Record<string, unknown>,
): Promise<Map<string, SecretProvider>> {
  const map = new Map<string, SecretProvider>();
  for (const [name, config] of Object.entries(providerConfigs)) {
    switch (name) {
      case "azure-keyvault": {
        const { AzureKeyVaultProvider } = await import("./azure-keyvault");
        map.set(name, new AzureKeyVaultProvider(config as AzureKeyVaultProviderConfig));
        break;
      }
      case "env":
        map.set(name, new EnvProvider());
        break;
      default:
        throw new Error(`Unknown secret provider: "${name}"`);
    }
  }
  return map;
}
