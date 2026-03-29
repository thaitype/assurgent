import type { SecretProvider } from "./provider";

/**
 * Resolves secrets from process.env.
 * No config needed -- reads environment variables directly.
 * .env file support is handled by Bun's --env-file flag, not by custom parsing.
 */
export class EnvProvider implements SecretProvider {
  readonly name = "env";

  async resolve(key: string): Promise<string> {
    const value = process.env[key];
    if (value === undefined) {
      throw new Error(`Environment variable "${key}" is not set.`);
    }
    return value;
  }
}
