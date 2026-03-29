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
