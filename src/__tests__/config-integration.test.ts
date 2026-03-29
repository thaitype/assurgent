import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig } from "../config";

describe("config integration: full loadConfig pipeline", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "assurgent-integ-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeConfig(config: unknown): string {
    const configPath = path.join(tempDir, "config.json");
    fs.writeFileSync(configPath, JSON.stringify(config), "utf-8");
    return configPath;
  }

  test("full pipeline with env provider resolves all handlebars", async () => {
    const originalToken = process.env.INTEG_BOT_TOKEN;
    const originalKey = process.env.INTEG_API_KEY;
    process.env.INTEG_BOT_TOKEN = "resolved-telegram-token";
    process.env.INTEG_API_KEY = "resolved-api-key";

    try {
      const configPath = writeConfig({
        secrets: {
          providers: { env: {} },
          entries: {
            telegramBotToken: { provider: "env", key: "INTEG_BOT_TOKEN" },
            apiKey: { provider: "env", key: "INTEG_API_KEY" },
          },
        },
        chat: {
          adapter: "telegram",
          telegram: {
            botToken: "${{secretRef.telegramBotToken}}",
            allowedUserIds: ["12345"],
          },
        },
        agent: {
          adapter: "claude-code",
          "claude-code": {
            model: "sonnet",
            maxTurns: 10,
            flags: [],
          },
        },
        session: { turnLimit: 20 },
        workspacePath: "/tmp/workspace",
      });

      const { config, resolvedSecrets } = await loadConfig(configPath);

      // Config values are resolved
      expect(config.chat.telegram.botToken).toBe("resolved-telegram-token");

      // Resolved secrets map contains all entries
      expect(resolvedSecrets.telegramBotToken).toBe("resolved-telegram-token");
      expect(resolvedSecrets.apiKey).toBe("resolved-api-key");
    } finally {
      if (originalToken === undefined) process.env.INTEG_BOT_TOKEN = undefined;
      else process.env.INTEG_BOT_TOKEN = originalToken;
      if (originalKey === undefined) process.env.INTEG_API_KEY = undefined;
      else process.env.INTEG_API_KEY = originalKey;
    }
  });

  test("backward compatible: config without secrets block loads normally", async () => {
    const configPath = writeConfig({
      chat: {
        adapter: "telegram",
        telegram: {
          botToken: "plain-token",
          allowedUserIds: ["12345"],
        },
      },
      agent: {
        adapter: "claude-code",
        "claude-code": {
          model: "sonnet",
          maxTurns: 10,
          flags: [],
        },
      },
      session: { turnLimit: 20 },
      workspacePath: "/tmp/workspace",
    });

    const { config, resolvedSecrets } = await loadConfig(configPath);
    expect(config.chat.telegram.botToken).toBe("plain-token");
    expect(resolvedSecrets).toEqual({});
  });

  test("error: handlebars in config but no secrets block", async () => {
    const configPath = writeConfig({
      chat: {
        adapter: "telegram",
        telegram: {
          botToken: "${{secretRef.telegramBotToken}}",
          allowedUserIds: ["12345"],
        },
      },
      agent: {
        adapter: "claude-code",
        "claude-code": {
          model: "sonnet",
          maxTurns: 10,
          flags: [],
        },
      },
      session: { turnLimit: 20 },
      workspacePath: "/tmp/workspace",
    });

    await expect(loadConfig(configPath)).rejects.toThrow(
      'Found ${{secretRef.*}} in config but no "secrets" block is defined.',
    );
  });

  test("error: unknown provider in secrets config", async () => {
    const configPath = writeConfig({
      secrets: {
        providers: { "unknown-provider": {} },
        entries: {
          mySecret: { provider: "unknown-provider", key: "test" },
        },
      },
      chat: {
        adapter: "telegram",
        telegram: {
          botToken: "${{secretRef.mySecret}}",
          allowedUserIds: ["12345"],
        },
      },
      agent: {
        adapter: "claude-code",
        "claude-code": {
          model: "sonnet",
          maxTurns: 10,
          flags: [],
        },
      },
      session: { turnLimit: 20 },
      workspacePath: "/tmp/workspace",
    });

    await expect(loadConfig(configPath)).rejects.toThrow(
      'Unknown secret provider: "unknown-provider"',
    );
  });

  test("error: env var not set for env provider", async () => {
    const testKey = "INTEG_MISSING_VAR_THAT_DOES_NOT_EXIST";
    delete process.env[testKey];

    const configPath = writeConfig({
      secrets: {
        providers: { env: {} },
        entries: {
          missingSecret: { provider: "env", key: testKey },
        },
      },
      chat: {
        adapter: "telegram",
        telegram: {
          botToken: "${{secretRef.missingSecret}}",
          allowedUserIds: ["12345"],
        },
      },
      agent: {
        adapter: "claude-code",
        "claude-code": {
          model: "sonnet",
          maxTurns: 10,
          flags: [],
        },
      },
      session: { turnLimit: 20 },
      workspacePath: "/tmp/workspace",
    });

    await expect(loadConfig(configPath)).rejects.toThrow(
      `Environment variable "${testKey}" is not set.`,
    );
  });

  test("config with security and proxy blocks loads correctly", async () => {
    const configPath = writeConfig({
      security: {
        blacklistEnv: ["AZURE_CLIENT_SECRET"],
      },
      proxy: {
        port: 9090,
        bypassWhitelist: false,
        whitelist: ["googleapis.com/**"],
      },
      chat: {
        adapter: "telegram",
        telegram: {
          botToken: "plain-token",
          allowedUserIds: ["12345"],
        },
      },
      agent: {
        adapter: "claude-code",
        "claude-code": {
          model: "sonnet",
          maxTurns: 10,
          flags: [],
        },
      },
      session: { turnLimit: 20 },
      workspacePath: "/tmp/workspace",
    });

    const { config } = await loadConfig(configPath);
    expect(config.security?.blacklistEnv).toEqual(["AZURE_CLIENT_SECRET"]);
    expect(config.proxy?.port).toBe(9090);
    expect(config.proxy?.whitelist).toEqual(["googleapis.com/**"]);
  });

  test("partial string interpolation with env provider", async () => {
    const originalToken = process.env.INTEG_PARTIAL_TOKEN;
    process.env.INTEG_PARTIAL_TOKEN = "my-api-key-123";

    try {
      const configPath = writeConfig({
        secrets: {
          providers: { env: {} },
          entries: {
            partialToken: { provider: "env", key: "INTEG_PARTIAL_TOKEN" },
          },
        },
        chat: {
          adapter: "telegram",
          telegram: {
            botToken: "Bearer ${{secretRef.partialToken}}",
            allowedUserIds: ["12345"],
          },
        },
        agent: {
          adapter: "claude-code",
          "claude-code": {
            model: "sonnet",
            maxTurns: 10,
            flags: [],
          },
        },
        session: { turnLimit: 20 },
        workspacePath: "/tmp/workspace",
      });

      const { config } = await loadConfig(configPath);
      expect(config.chat.telegram.botToken).toBe("Bearer my-api-key-123");
    } finally {
      if (originalToken === undefined) process.env.INTEG_PARTIAL_TOKEN = undefined;
      else process.env.INTEG_PARTIAL_TOKEN = originalToken;
    }
  });
});
