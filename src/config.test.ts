import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getAssurgentHome, loadConfig, validateConfig } from "./config";
import type { Config } from "./config";

function validConfig(): Config {
  return {
    chat: {
      adapter: "telegram",
      telegram: {
        botToken: "123456:ABC-DEF",
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
    session: {
      turnLimit: 20,
    },
    workspacePath: "/tmp/workspace",
  };
}

describe("getAssurgentHome", () => {
  const originalEnv = process.env.ASSURGENT_HOME;

  afterEach(() => {
    if (originalEnv === undefined) {
      process.env.ASSURGENT_HOME = undefined;
    } else {
      process.env.ASSURGENT_HOME = originalEnv;
    }
  });

  test("returns ~/.assurgent when ASSURGENT_HOME is not set", () => {
    process.env.ASSURGENT_HOME = undefined;
    const expected = path.join(os.homedir(), ".assurgent");
    expect(getAssurgentHome()).toBe(expected);
  });

  test("returns ASSURGENT_HOME env var value when set", () => {
    process.env.ASSURGENT_HOME = "/custom/assurgent/home";
    expect(getAssurgentHome()).toBe("/custom/assurgent/home");
  });
});

describe("loadConfig", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "assurgent-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env.ASSURGENT_HOME = undefined;
  });

  function writeConfig(dir: string, config: unknown): string {
    const configPath = path.join(dir, "config.json");
    fs.writeFileSync(configPath, JSON.stringify(config), "utf-8");
    return configPath;
  }

  test("reads config from explicit path", async () => {
    const configPath = writeConfig(tempDir, validConfig());
    const { config } = await loadConfig(configPath);
    expect(config.chat.adapter).toBe("telegram");
    expect(config.session.turnLimit).toBe(20);
  });

  test("reads config from $ASSURGENT_HOME/config.json when no explicit path", async () => {
    process.env.ASSURGENT_HOME = tempDir;
    writeConfig(tempDir, validConfig());
    const { config } = await loadConfig();
    expect(config.chat.adapter).toBe("telegram");
  });

  test("throws with helpful error when config is missing and explicit path given", async () => {
    const missingPath = path.join(tempDir, "nonexistent.json");
    await expect(loadConfig(missingPath)).rejects.toThrow("Config file not found");
  });

  test("throws mentioning 'assurgent init' when config is missing", async () => {
    const missingPath = path.join(tempDir, "nonexistent.json");
    await expect(loadConfig(missingPath)).rejects.toThrow("assurgent init");
  });

  test("throws mentioning 'ASSURGENT_HOME' when config is missing", async () => {
    const missingPath = path.join(tempDir, "nonexistent.json");
    await expect(loadConfig(missingPath)).rejects.toThrow("ASSURGENT_HOME");
  });

  test("throws with config path in error message when config is missing", async () => {
    process.env.ASSURGENT_HOME = tempDir;
    await expect(loadConfig()).rejects.toThrow(path.join(tempDir, "config.json"));
  });

  test("resolves secretRef handlebars when secrets block exists", async () => {
    const originalEnv = process.env.TEST_BOT_TOKEN;
    process.env.TEST_BOT_TOKEN = "resolved-bot-token";

    try {
      const rawConfig = {
        ...validConfig(),
        chat: {
          adapter: "telegram",
          telegram: {
            botToken: "${{secretRef.telegramBotToken}}",
            allowedUserIds: ["12345"],
          },
        },
        secrets: {
          providers: { env: {} },
          entries: {
            telegramBotToken: { provider: "env", key: "TEST_BOT_TOKEN" },
          },
        },
      };

      const configPath = writeConfig(tempDir, rawConfig);
      const { config, resolvedSecrets } = await loadConfig(configPath);
      expect(config.chat.telegram.botToken).toBe("resolved-bot-token");
      expect(resolvedSecrets.telegramBotToken).toBe("resolved-bot-token");
    } finally {
      if (originalEnv === undefined) {
        process.env.TEST_BOT_TOKEN = undefined;
      } else {
        process.env.TEST_BOT_TOKEN = originalEnv;
      }
    }
  });

  test("throws when handlebars exist but no secrets block", async () => {
    const rawConfig = {
      ...validConfig(),
      chat: {
        adapter: "telegram",
        telegram: {
          botToken: "${{secretRef.telegramBotToken}}",
          allowedUserIds: ["12345"],
        },
      },
    };

    const configPath = writeConfig(tempDir, rawConfig);
    await expect(loadConfig(configPath)).rejects.toThrow(
      'Found ${{secretRef.*}} in config but no "secrets" block is defined.',
    );
  });

  test("works with plain config without secrets block (backward compatible)", async () => {
    const configPath = writeConfig(tempDir, validConfig());
    const { config, resolvedSecrets } = await loadConfig(configPath);
    expect(config.chat.telegram.botToken).toBe("123456:ABC-DEF");
    expect(resolvedSecrets).toEqual({});
  });
});

describe("validateConfig", () => {
  test("accepts valid config", () => {
    expect(() => validateConfig(validConfig())).not.toThrow();
  });

  test("rejects missing botToken", () => {
    const config = validConfig();
    config.chat.telegram.botToken = "";
    expect(() => validateConfig(config)).toThrow("botToken");
  });

  test("rejects empty allowedUserIds", () => {
    const config = validConfig();
    config.chat.telegram.allowedUserIds = [];
    expect(() => validateConfig(config)).toThrow("allowedUserIds");
  });

  test("rejects turnLimit of 0", () => {
    const config = validConfig();
    config.session.turnLimit = 0;
    expect(() => validateConfig(config)).toThrow("turnLimit");
  });

  test("rejects negative turnLimit", () => {
    const config = validConfig();
    config.session.turnLimit = -5;
    expect(() => validateConfig(config)).toThrow("turnLimit");
  });

  test("rejects relative workspacePath", () => {
    const config = validConfig();
    config.workspacePath = "relative/path";
    expect(() => validateConfig(config)).toThrow("workspacePath");
  });
});
