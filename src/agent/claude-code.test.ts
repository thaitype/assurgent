import { describe, expect, test } from "bun:test";
import type { ClaudeCodeConfig } from "./claude-code";
import { SUPPORTED_MODELS, buildArgs, filterEnv } from "./claude-code";

const baseConfig: ClaudeCodeConfig = {
  model: "opus",
  maxTurns: 10,
  flags: [],
};

describe("SUPPORTED_MODELS", () => {
  test("contains opus, sonnet, haiku", () => {
    expect(SUPPORTED_MODELS).toContain("opus");
    expect(SUPPORTED_MODELS).toContain("sonnet");
    expect(SUPPORTED_MODELS).toContain("haiku");
  });

  test("has exactly 3 entries", () => {
    expect(SUPPORTED_MODELS.length).toBe(3);
  });
});

describe("buildArgs", () => {
  test("always includes -p and --output-format json", () => {
    const args = buildArgs(baseConfig, { message: "hello" });
    expect(args).toContain("-p");
    expect(args).toContain("--output-format");
    expect(args).toContain("json");
  });

  test("includes --max-turns from config when not overridden", () => {
    const args = buildArgs(baseConfig, { message: "hello" });
    const idx = args.indexOf("--max-turns");
    expect(idx).not.toBe(-1);
    expect(args[idx + 1]).toBe("10");
  });

  test("includes --resume when sessionId is provided", () => {
    const args = buildArgs(baseConfig, {
      message: "hello",
      sessionId: "9b55c171-cee9-4883-a365-abf385761889",
    });
    const idx = args.indexOf("--resume");
    expect(idx).not.toBe(-1);
    expect(args[idx + 1]).toBe("9b55c171-cee9-4883-a365-abf385761889");
  });

  test("does not include --resume when sessionId is absent", () => {
    const args = buildArgs(baseConfig, { message: "hello" });
    expect(args).not.toContain("--resume");
  });

  test("options.model overrides config.model", () => {
    const args = buildArgs(baseConfig, { message: "hello", model: "sonnet" });
    const idx = args.indexOf("--model");
    expect(idx).not.toBe(-1);
    expect(args[idx + 1]).toBe("sonnet");
    expect(args.filter((a) => a === "--model").length).toBe(1);
  });

  test("includes --append-system-prompt when appendPrompt is set", () => {
    const args = buildArgs(baseConfig, {
      message: "hello",
      appendPrompt: "Be concise.",
    });
    const idx = args.indexOf("--append-system-prompt");
    expect(idx).not.toBe(-1);
    expect(args[idx + 1]).toBe("Be concise.");
  });

  test("includes config flags", () => {
    const config: ClaudeCodeConfig = {
      ...baseConfig,
      flags: ["--dangerously-skip-permissions"],
    };
    const args = buildArgs(config, { message: "hello" });
    expect(args).toContain("--dangerously-skip-permissions");
  });

  test("message is always the last argument", () => {
    const args = buildArgs(baseConfig, {
      message: "do the thing",
      sessionId: "abc-123",
      appendPrompt: "extra",
    });
    expect(args[args.length - 1]).toBe("do the thing");
  });
});

describe("filterEnv", () => {
  test("removes blacklisted env vars", () => {
    const env = {
      PATH: "/usr/bin",
      AZURE_CLIENT_SECRET: "secret-value",
      HOME: "/home/user",
    };
    const result = filterEnv(env, ["AZURE_CLIENT_SECRET"]);
    expect(result).toEqual({ PATH: "/usr/bin", HOME: "/home/user" });
  });

  test("passes all vars when blacklist is empty", () => {
    const env = {
      PATH: "/usr/bin",
      HOME: "/home/user",
    };
    const result = filterEnv(env, []);
    expect(result).toEqual({ PATH: "/usr/bin", HOME: "/home/user" });
  });

  test("removes multiple blacklisted vars", () => {
    const env = {
      PATH: "/usr/bin",
      AZURE_CLIENT_ID: "id",
      AZURE_CLIENT_SECRET: "secret",
      AZURE_TENANT_ID: "tenant",
      HOME: "/home/user",
    };
    const result = filterEnv(env, ["AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "AZURE_TENANT_ID"]);
    expect(result).toEqual({ PATH: "/usr/bin", HOME: "/home/user" });
  });

  test("handles blacklist with vars not in env", () => {
    const env = { PATH: "/usr/bin" };
    const result = filterEnv(env, ["NONEXISTENT_VAR"]);
    expect(result).toEqual({ PATH: "/usr/bin" });
  });

  test("excludes undefined values", () => {
    const env = { PATH: "/usr/bin", UNDEF: undefined } as NodeJS.ProcessEnv;
    const result = filterEnv(env, []);
    expect(result).toEqual({ PATH: "/usr/bin" });
  });
});
