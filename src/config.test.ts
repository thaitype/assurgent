import { describe, expect, test } from "bun:test";
import { validateConfig } from "./config";
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
