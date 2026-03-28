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

  function writeConfig(dir: string, config: Config): string {
    const configPath = path.join(dir, "config.json");
    fs.writeFileSync(configPath, JSON.stringify(config), "utf-8");
    return configPath;
  }

  test("reads config from explicit path", () => {
    const configPath = writeConfig(tempDir, validConfig());
    const config = loadConfig(configPath);
    expect(config.chat.adapter).toBe("telegram");
    expect(config.session.turnLimit).toBe(20);
  });

  test("reads config from $ASSURGENT_HOME/config.json when no explicit path", () => {
    process.env.ASSURGENT_HOME = tempDir;
    writeConfig(tempDir, validConfig());
    const config = loadConfig();
    expect(config.chat.adapter).toBe("telegram");
  });

  test("throws with helpful error when config is missing and explicit path given", () => {
    const missingPath = path.join(tempDir, "nonexistent.json");
    expect(() => loadConfig(missingPath)).toThrow("Config file not found");
  });

  test("throws mentioning 'assurgent init' when config is missing", () => {
    const missingPath = path.join(tempDir, "nonexistent.json");
    expect(() => loadConfig(missingPath)).toThrow("assurgent init");
  });

  test("throws mentioning 'ASSURGENT_HOME' when config is missing", () => {
    const missingPath = path.join(tempDir, "nonexistent.json");
    expect(() => loadConfig(missingPath)).toThrow("ASSURGENT_HOME");
  });

  test("throws with config path in error message when config is missing", () => {
    process.env.ASSURGENT_HOME = tempDir;
    expect(() => loadConfig()).toThrow(path.join(tempDir, "config.json"));
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
