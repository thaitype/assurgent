import { describe, expect, mock, test } from "bun:test";
import { AzureKeyVaultProvider } from "./azure-keyvault";
import { createProviders } from "./resolver";

// Mock the Azure SDK modules
mock.module("@azure/identity", () => ({
  DefaultAzureCredential: class MockCredential {},
}));

let mockGetSecret: ReturnType<typeof mock>;

mock.module("@azure/keyvault-secrets", () => ({
  SecretClient: class MockSecretClient {
    getSecret(name: string) {
      return mockGetSecret(name);
    }
  },
}));

describe("AzureKeyVaultProvider", () => {
  test("name is 'azure-keyvault'", () => {
    const provider = new AzureKeyVaultProvider({
      vaultUrl: "https://test-vault.vault.azure.net",
    });
    expect(provider.name).toBe("azure-keyvault");
  });

  test("resolves a secret successfully", async () => {
    mockGetSecret = mock(async (name: string) => ({
      value: `resolved-${name}`,
    }));

    const provider = new AzureKeyVaultProvider({
      vaultUrl: "https://test-vault.vault.azure.net",
    });

    const result = await provider.resolve("my-secret");
    expect(result).toBe("resolved-my-secret");
    expect(mockGetSecret).toHaveBeenCalledTimes(1);
  });

  test("throws when secret has no value", async () => {
    mockGetSecret = mock(async () => ({ value: undefined }));

    const provider = new AzureKeyVaultProvider({
      vaultUrl: "https://test-vault.vault.azure.net",
    });

    await expect(provider.resolve("empty-secret")).rejects.toThrow(
      'Secret "empty-secret" exists in azure-keyvault but has no value.',
    );
  });

  test("retries on failure and succeeds on later attempt", async () => {
    let callCount = 0;
    mockGetSecret = mock(async (name: string) => {
      callCount++;
      if (callCount < 3) {
        throw new Error("Transient failure");
      }
      return { value: `resolved-${name}` };
    });

    const provider = new AzureKeyVaultProvider({
      vaultUrl: "https://test-vault.vault.azure.net",
    });

    // Use a short timeout -- the real delays are 2s/4s/8s but mocked module
    // still uses real sleep. We test the retry logic structure here.
    const result = await provider.resolve("retry-secret");
    expect(result).toBe("resolved-retry-secret");
    expect(callCount).toBe(3);
  }, 30_000);

  test("throws after exhausting all retries", async () => {
    mockGetSecret = mock(async () => {
      throw new Error("Persistent failure");
    });

    const provider = new AzureKeyVaultProvider({
      vaultUrl: "https://test-vault.vault.azure.net",
    });

    await expect(provider.resolve("doomed-secret")).rejects.toThrow(
      'Failed to resolve secret "doomed-secret" from azure-keyvault after 3 retries',
    );
    await expect(provider.resolve("doomed-secret")).rejects.toThrow("Persistent failure");
  }, 30_000);

  test("dispose does not throw", async () => {
    const provider = new AzureKeyVaultProvider({
      vaultUrl: "https://test-vault.vault.azure.net",
    });
    await expect(provider.dispose()).resolves.toBeUndefined();
  });
});

describe("createProviders", () => {
  test("creates env provider", async () => {
    const providers = await createProviders({ env: {} });
    expect(providers.has("env")).toBe(true);
    expect(providers.get("env")?.name).toBe("env");
  });

  test("creates azure-keyvault provider", async () => {
    const providers = await createProviders({
      "azure-keyvault": {
        vaultUrl: "https://test-vault.vault.azure.net",
      },
    });
    expect(providers.has("azure-keyvault")).toBe(true);
    expect(providers.get("azure-keyvault")?.name).toBe("azure-keyvault");
  });

  test("creates multiple providers", async () => {
    const providers = await createProviders({
      env: {},
      "azure-keyvault": {
        vaultUrl: "https://test-vault.vault.azure.net",
      },
    });
    expect(providers.size).toBe(2);
  });

  test("throws for unknown provider", async () => {
    await expect(createProviders({ "unknown-provider": {} })).rejects.toThrow(
      'Unknown secret provider: "unknown-provider"',
    );
  });
});
