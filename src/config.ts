import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Runtime configuration for the bot. */
export interface Config {
  chat: {
    adapter: "telegram";
    telegram: {
      botToken: string;
      allowedUserIds: string[];
      placeholder?: {
        enabled: boolean;
        text: string;
      };
    };
  };
  agent: {
    adapter: "claude-code";
    "claude-code": {
      model: string;
      maxTurns: number;
      flags: string[];
      /** Full path to the claude binary. Defaults to "claude" (found via PATH). */
      claudePath?: string;
    };
  };
  session: {
    turnLimit: number;
  };
  /** Absolute path to the workspace directory Claude Code runs in. */
  workspacePath: string;
}

/** Returns the resolved ASSURGENT_HOME path. */
export function getAssurgentHome(): string {
  return process.env.ASSURGENT_HOME ?? path.join(os.homedir(), ".assurgent");
}

/** Fail fast with clear errors if required config fields are missing or invalid. */
export function validateConfig(config: Config): void {
  const errors: string[] = [];

  if (config.chat?.adapter !== "telegram") {
    errors.push('chat.adapter must be "telegram"');
  }

  if (!config.chat?.telegram?.botToken) {
    errors.push("chat.telegram.botToken is required");
  }

  if (!config.chat?.telegram?.allowedUserIds?.length) {
    errors.push("chat.telegram.allowedUserIds must have at least one entry");
  }

  if (config.agent?.adapter !== "claude-code") {
    errors.push('agent.adapter must be "claude-code"');
  }

  if (
    config.session?.turnLimit === undefined ||
    config.session?.turnLimit === null ||
    typeof config.session?.turnLimit !== "number" ||
    config.session.turnLimit <= 0
  ) {
    errors.push("session.turnLimit must be a positive number");
  }

  if (!config.workspacePath || !path.isAbsolute(config.workspacePath)) {
    errors.push("workspacePath must be an absolute path");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid config.json:\n  - ${errors.join("\n  - ")}`);
  }
}

/** Load and validate config from a JSON file. */
export function loadConfig(configPath?: string): Config {
  const resolved = configPath ?? path.join(getAssurgentHome(), "config.json");

  if (!fs.existsSync(resolved)) {
    throw new Error(
      `Config file not found: ${resolved}\nRun "assurgent init" to create one, or set ASSURGENT_HOME to point to an existing config directory.`,
    );
  }

  const raw = JSON.parse(fs.readFileSync(resolved, "utf-8"));
  const config = raw as Config;
  validateConfig(config);
  return config;
}
