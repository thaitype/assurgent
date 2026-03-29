import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SecretEntry } from "./secrets/resolver";
import {
  assertNoUnresolvedRefs,
  createProviders,
  hasSecretRefs,
  substituteSecrets,
} from "./secrets/resolver";

/** Runtime configuration for the bot. */
export interface Config {
  /** Multi-provider secrets configuration. Optional. */
  secrets?: {
    providers: Record<string, unknown>;
    entries: Record<string, SecretEntry>;
  };
  /** Security settings. Optional. */
  security?: {
    /** Env var names to strip from child process environment. */
    blacklistEnv?: string[];
  };
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
  /** Proxy configuration. Optional -- proxy only starts if this block exists. */
  proxy?: {
    port?: number;
    bypassWhitelist?: boolean;
    whitelist?: string[];
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

/** Result of loading config, including resolved secrets for proxy use. */
export interface LoadConfigResult {
  config: Config;
  /** Resolved secrets keyed by handlebar name (e.g., "telegramBotToken" -> "actual-value"). */
  resolvedSecrets: Record<string, string>;
}

/** Load and validate config from a JSON file. Always async. */
export async function loadConfig(configPath?: string): Promise<LoadConfigResult> {
  const resolved = configPath ?? path.join(getAssurgentHome(), "config.json");

  if (!fs.existsSync(resolved)) {
    throw new Error(
      `Config file not found: ${resolved}\nRun "assurgent init" to create one, or set ASSURGENT_HOME to point to an existing config directory.`,
    );
  }

  const raw = JSON.parse(fs.readFileSync(resolved, "utf-8"));

  // Pre-resolution check: if handlebars exist but no secrets block, fail early
  if (hasSecretRefs(raw) && !raw.secrets) {
    throw new Error('Found ${{secretRef.*}} in config but no "secrets" block is defined.');
  }

  // Resolve secrets if the secrets block exists
  if (raw.secrets) {
    const providers = await createProviders(raw.secrets.providers);
    try {
      // Resolve each secret entry once and build the resolved secrets map
      const resolvedSecrets: Record<string, string> = {};
      const entries = raw.secrets.entries as Record<string, SecretEntry>;
      for (const [name, entry] of Object.entries(entries)) {
        const provider = providers.get(entry.provider);
        if (!provider) {
          throw new Error(
            `Secret "${name}" references provider "${entry.provider}" which is not defined in secrets.providers.`,
          );
        }
        resolvedSecrets[name] = await provider.resolve(entry.key);
      }

      // Substitute handlebars using the already-resolved map (no second provider call)
      const resolvedConfig = substituteSecrets(raw, resolvedSecrets);

      // Post-resolution check: no handlebars should remain
      assertNoUnresolvedRefs(resolvedConfig);

      const config = resolvedConfig as Config;
      validateConfig(config);
      return { config, resolvedSecrets };
    } finally {
      for (const provider of providers.values()) {
        await provider.dispose?.();
      }
    }
  }

  // No secrets block -- plain config, no resolution needed
  const config = raw as Config;
  validateConfig(config);
  return { config, resolvedSecrets: {} };
}
