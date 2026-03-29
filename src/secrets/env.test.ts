import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { EnvProvider } from "./env";

describe("EnvProvider", () => {
  const provider = new EnvProvider();

  test("name is 'env'", () => {
    expect(provider.name).toBe("env");
  });

  describe("resolve", () => {
    const testKey = "ASSURGENT_TEST_SECRET_VAR";
    const originalValue = process.env[testKey];

    afterEach(() => {
      if (originalValue === undefined) {
        delete process.env[testKey];
      } else {
        process.env[testKey] = originalValue;
      }
    });

    test("resolves an existing environment variable", async () => {
      process.env[testKey] = "my-secret-value";
      const result = await provider.resolve(testKey);
      expect(result).toBe("my-secret-value");
    });

    test("throws when environment variable is not set", async () => {
      delete process.env[testKey];
      await expect(provider.resolve(testKey)).rejects.toThrow(
        `Environment variable "${testKey}" is not set.`,
      );
    });

    test("resolves empty string env var without throwing", async () => {
      process.env[testKey] = "";
      const result = await provider.resolve(testKey);
      expect(result).toBe("");
    });
  });
});
