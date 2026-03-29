import { describe, expect, test } from "bun:test";
import type { SecretProvider } from "./provider";
import {
  assertNoUnresolvedRefs,
  hasSecretRefs,
  resolveSecrets,
  substituteSecrets,
} from "./resolver";
import type { SecretEntry } from "./resolver";

/** Simple mock provider that returns predictable values. */
function mockProvider(name: string, secrets: Record<string, string>): SecretProvider {
  return {
    name,
    async resolve(key: string): Promise<string> {
      const value = secrets[key];
      if (value === undefined) {
        throw new Error(`Secret "${key}" not found in ${name}`);
      }
      return value;
    },
  };
}

function makeProviders(...providers: SecretProvider[]): Map<string, SecretProvider> {
  const map = new Map<string, SecretProvider>();
  for (const p of providers) {
    map.set(p.name, p);
  }
  return map;
}

describe("resolveSecrets", () => {
  const envProvider = mockProvider("env", {
    DEV_TOKEN: "dev-token-value",
    API_KEY: "api-key-value",
  });

  const vaultProvider = mockProvider("azure-keyvault", {
    "telegram-bot-token": "123456:ABC-DEF",
    "google-calendar-token": "gcal-token-xyz",
  });

  const providers = makeProviders(envProvider, vaultProvider);

  const entries: Record<string, SecretEntry> = {
    telegramBotToken: { provider: "azure-keyvault", key: "telegram-bot-token" },
    googleCalendarToken: {
      provider: "azure-keyvault",
      key: "google-calendar-token",
    },
    devToken: { provider: "env", key: "DEV_TOKEN" },
    apiKey: { provider: "env", key: "API_KEY" },
  };

  test("resolves full replacement handlebar", async () => {
    const config = { token: "${{secretRef.telegramBotToken}}" };
    const result = (await resolveSecrets(config, providers, entries)) as {
      token: string;
    };
    expect(result.token).toBe("123456:ABC-DEF");
  });

  test("resolves partial string interpolation", async () => {
    const config = { header: "Bearer ${{secretRef.devToken}}" };
    const result = (await resolveSecrets(config, providers, entries)) as {
      header: string;
    };
    expect(result.header).toBe("Bearer dev-token-value");
  });

  test("resolves multiple handlebars in one string", async () => {
    const config = {
      combined: "${{secretRef.devToken}}:${{secretRef.apiKey}}",
    };
    const result = (await resolveSecrets(config, providers, entries)) as {
      combined: string;
    };
    expect(result.combined).toBe("dev-token-value:api-key-value");
  });

  test("resolves nested objects", async () => {
    const config = {
      chat: {
        telegram: {
          botToken: "${{secretRef.telegramBotToken}}",
        },
      },
    };
    const result = (await resolveSecrets(config, providers, entries)) as {
      chat: { telegram: { botToken: string } };
    };
    expect(result.chat.telegram.botToken).toBe("123456:ABC-DEF");
  });

  test("resolves values in arrays", async () => {
    const config = {
      tokens: ["${{secretRef.devToken}}", "${{secretRef.googleCalendarToken}}"],
    };
    const result = (await resolveSecrets(config, providers, entries)) as {
      tokens: string[];
    };
    expect(result.tokens).toEqual(["dev-token-value", "gcal-token-xyz"]);
  });

  test("passes through non-string values unchanged", async () => {
    const config = {
      port: 9090,
      enabled: true,
      nothing: null,
      name: "plain string",
    };
    const result = await resolveSecrets(config, providers, entries);
    expect(result).toEqual(config);
  });

  test("does not mutate the input config", async () => {
    const config = { token: "${{secretRef.telegramBotToken}}" };
    const original = JSON.parse(JSON.stringify(config));
    await resolveSecrets(config, providers, entries);
    expect(config).toEqual(original);
  });

  test("throws for unknown secret name", async () => {
    const config = { token: "${{secretRef.unknownSecret}}" };
    await expect(resolveSecrets(config, providers, entries)).rejects.toThrow(
      'Unknown secret name "unknownSecret"',
    );
    await expect(resolveSecrets(config, providers, entries)).rejects.toThrow("config path: token");
  });

  test("throws for unknown provider in entry", async () => {
    const badEntries: Record<string, SecretEntry> = {
      mySecret: { provider: "nonexistent", key: "some-key" },
    };
    const config = { token: "${{secretRef.mySecret}}" };
    await expect(resolveSecrets(config, providers, badEntries)).rejects.toThrow(
      'Secret "mySecret" references provider "nonexistent" which is not defined in secrets.providers.',
    );
  });

  test("includes config path in nested error", async () => {
    const config = {
      chat: {
        telegram: {
          botToken: "${{secretRef.unknownSecret}}",
        },
      },
    };
    await expect(resolveSecrets(config, providers, entries)).rejects.toThrow(
      "config path: chat.telegram.botToken",
    );
  });

  test("includes config path for array elements", async () => {
    const config = {
      tokens: ["ok", "${{secretRef.unknownSecret}}"],
    };
    await expect(resolveSecrets(config, providers, entries)).rejects.toThrow(
      "config path: tokens[1]",
    );
  });

  test("propagates provider errors with context", async () => {
    const failingProvider = mockProvider("env", {});
    const failProviders = makeProviders(failingProvider, vaultProvider);
    const config = { token: "${{secretRef.devToken}}" };
    await expect(resolveSecrets(config, failProviders, entries)).rejects.toThrow(
      'Secret "DEV_TOKEN" not found in env',
    );
  });
});

describe("hasSecretRefs", () => {
  test("returns true for string with handlebar", () => {
    expect(hasSecretRefs("${{secretRef.token}}")).toBe(true);
  });

  test("returns false for plain string", () => {
    expect(hasSecretRefs("plain string")).toBe(false);
  });

  test("returns true for nested object with handlebar", () => {
    expect(hasSecretRefs({ a: { b: "${{secretRef.token}}" } })).toBe(true);
  });

  test("returns false for object without handlebars", () => {
    expect(hasSecretRefs({ a: { b: "plain" } })).toBe(false);
  });

  test("returns true for array with handlebar", () => {
    expect(hasSecretRefs(["plain", "${{secretRef.token}}"])).toBe(true);
  });

  test("returns false for non-string primitives", () => {
    expect(hasSecretRefs(42)).toBe(false);
    expect(hasSecretRefs(null)).toBe(false);
    expect(hasSecretRefs(true)).toBe(false);
  });
});

describe("substituteSecrets", () => {
  const resolvedSecrets: Record<string, string> = {
    telegramBotToken: "123456:ABC-DEF",
    googleCalendarToken: "gcal-token-xyz",
    devToken: "dev-token-value",
    apiKey: "api-key-value",
  };

  test("substitutes full replacement handlebar", () => {
    const config = { token: "${{secretRef.telegramBotToken}}" };
    const result = substituteSecrets(config, resolvedSecrets) as { token: string };
    expect(result.token).toBe("123456:ABC-DEF");
  });

  test("substitutes partial string interpolation", () => {
    const config = { header: "Bearer ${{secretRef.devToken}}" };
    const result = substituteSecrets(config, resolvedSecrets) as { header: string };
    expect(result.header).toBe("Bearer dev-token-value");
  });

  test("substitutes multiple handlebars in one string", () => {
    const config = { combined: "${{secretRef.devToken}}:${{secretRef.apiKey}}" };
    const result = substituteSecrets(config, resolvedSecrets) as { combined: string };
    expect(result.combined).toBe("dev-token-value:api-key-value");
  });

  test("substitutes in nested objects", () => {
    const config = {
      chat: { telegram: { botToken: "${{secretRef.telegramBotToken}}" } },
    };
    const result = substituteSecrets(config, resolvedSecrets) as {
      chat: { telegram: { botToken: string } };
    };
    expect(result.chat.telegram.botToken).toBe("123456:ABC-DEF");
  });

  test("substitutes values in arrays", () => {
    const config = {
      tokens: ["${{secretRef.devToken}}", "${{secretRef.googleCalendarToken}}"],
    };
    const result = substituteSecrets(config, resolvedSecrets) as { tokens: string[] };
    expect(result.tokens).toEqual(["dev-token-value", "gcal-token-xyz"]);
  });

  test("passes through non-string values unchanged", () => {
    const config = { port: 9090, enabled: true, nothing: null, name: "plain" };
    const result = substituteSecrets(config, resolvedSecrets);
    expect(result).toEqual(config);
  });

  test("does not mutate the input config", () => {
    const config = { token: "${{secretRef.telegramBotToken}}" };
    const original = JSON.parse(JSON.stringify(config));
    substituteSecrets(config, resolvedSecrets);
    expect(config).toEqual(original);
  });

  test("throws for unknown secret name", () => {
    const config = { token: "${{secretRef.unknownSecret}}" };
    expect(() => substituteSecrets(config, resolvedSecrets)).toThrow(
      'Unknown secret name "unknownSecret"',
    );
    expect(() => substituteSecrets(config, resolvedSecrets)).toThrow("config path: token");
  });

  test("includes config path for nested errors", () => {
    const config = { chat: { telegram: { botToken: "${{secretRef.unknownSecret}}" } } };
    expect(() => substituteSecrets(config, resolvedSecrets)).toThrow(
      "config path: chat.telegram.botToken",
    );
  });

  test("includes config path for array elements", () => {
    const config = { tokens: ["ok", "${{secretRef.unknownSecret}}"] };
    expect(() => substituteSecrets(config, resolvedSecrets)).toThrow("config path: tokens[1]");
  });
});

describe("assertNoUnresolvedRefs", () => {
  test("does not throw for fully resolved config", () => {
    expect(() => assertNoUnresolvedRefs({ token: "resolved-value", port: 9090 })).not.toThrow();
  });

  test("throws for config with remaining handlebars", () => {
    expect(() => assertNoUnresolvedRefs({ token: "${{secretRef.leftover}}" })).toThrow(
      "unresolved",
    );
  });
});
