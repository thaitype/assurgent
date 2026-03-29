import type { SecretProvider } from "./provider";

export interface AzureKeyVaultProviderConfig {
  /** Key Vault URL, e.g. "https://my-vault.vault.azure.net" */
  vaultUrl: string;
}

/** Retry delays in milliseconds: 2s, 4s, 8s. */
const RETRY_DELAYS = [2000, 4000, 8000];

/**
 * Resolves secrets from Azure Key Vault.
 * Uses DefaultAzureCredential (picks up env vars, managed identity, CLI auth, etc).
 * Retries 3 times with exponential backoff (2s/4s/8s) on failure, then crashes.
 *
 * Azure SDK packages (`@azure/identity`, `@azure/keyvault-secrets`) are loaded
 * lazily via dynamic `import()` so they are only fetched when this provider is
 * actually instantiated.
 */
export class AzureKeyVaultProvider implements SecretProvider {
  readonly name = "azure-keyvault";
  private client: { getSecret(name: string): Promise<{ value?: string }> } | undefined;
  private readonly vaultUrl: string;

  constructor(config: AzureKeyVaultProviderConfig) {
    this.vaultUrl = config.vaultUrl;
  }

  /** Lazily initialise the Azure SecretClient on first use. */
  private async ensureClient(): Promise<{ getSecret(name: string): Promise<{ value?: string }> }> {
    if (!this.client) {
      const { DefaultAzureCredential } = await import("@azure/identity");
      const { SecretClient } = await import("@azure/keyvault-secrets");
      const credential = new DefaultAzureCredential();
      this.client = new SecretClient(this.vaultUrl, credential);
    }
    return this.client;
  }

  async resolve(key: string): Promise<string> {
    const secret = await this.fetchWithRetry(key);
    if (secret.value === undefined) {
      throw new Error(`Secret "${key}" exists in azure-keyvault but has no value.`);
    }
    return secret.value;
  }

  /** Fetch a secret with retry logic. Only retries network/auth failures. */
  private async fetchWithRetry(key: string): Promise<{ value?: string }> {
    const client = await this.ensureClient();
    let lastError: unknown;

    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        return await client.getSecret(key);
      } catch (error) {
        lastError = error;

        if (attempt < RETRY_DELAYS.length) {
          const delay = RETRY_DELAYS[attempt];
          await sleep(delay);
        }
      }
    }

    throw new Error(
      `Failed to resolve secret "${key}" from azure-keyvault after ${RETRY_DELAYS.length} retries: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
  }

  async dispose(): Promise<void> {
    // SecretClient does not require explicit cleanup
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
