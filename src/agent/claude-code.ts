import { execa } from "execa";
import type { AgentAdapter, AgentInvokeOptions, AgentResponse } from "../interfaces/agent-adapter";

export const SUPPORTED_MODELS = ["opus", "sonnet", "haiku"] as const;

export interface ClaudeCodeConfig {
  model: string;
  maxTurns: number;
  flags: string[];
  claudePath?: string;
  /** Env var names to strip from child process environment. */
  blacklistEnv?: string[];
}

/**
 * Builds the CLI argument array for `claude -p` invocations.
 * Pure function -- no side effects.
 */
export function buildArgs(config: ClaudeCodeConfig, options: AgentInvokeOptions): string[] {
  const args: string[] = [
    "-p",
    "--output-format",
    "json",
    "--max-turns",
    String(options.maxTurns ?? config.maxTurns),
  ];

  // Spread configured flags (e.g. --dangerously-skip-permissions)
  args.push(...config.flags);

  if (options.sessionId) {
    args.push("--resume", options.sessionId);
  }

  const model = options.model ?? config.model;
  if (model) {
    args.push("--model", model);
  }

  if (options.appendPrompt) {
    args.push("--append-system-prompt", options.appendPrompt);
  }

  // Message must always be the last argument
  args.push(options.message);

  return args;
}

/**
 * Filter environment variables by removing blacklisted keys.
 * Returns a new object with only non-blacklisted vars that have defined values.
 */
export function filterEnv(env: NodeJS.ProcessEnv, blacklist: string[]): Record<string, string> {
  const blocked = new Set(blacklist);
  const safeEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (!blocked.has(key) && value !== undefined) {
      safeEnv[key] = value;
    }
  }
  return safeEnv;
}

/** AgentAdapter implementation backed by the Claude Code CLI. */
export class ClaudeCodeAdapter implements AgentAdapter {
  readonly name = "claude-code";

  constructor(
    private config: ClaudeCodeConfig,
    private workspacePath: string,
  ) {}

  async invoke(options: AgentInvokeOptions): Promise<AgentResponse> {
    const args = buildArgs(this.config, options);

    const safeEnv = filterEnv(process.env, this.config.blacklistEnv ?? []);

    const proc = await execa(this.config.claudePath ?? "claude", args, {
      cwd: this.workspacePath,
      timeout: 180_000,
      stdin: "ignore",
      env: {
        ...safeEnv,
        AGENT_SESSION_ID: options.sessionId ?? "",
      },
    });

    const raw = JSON.parse(proc.stdout) as Record<string, unknown>;

    return {
      result: (raw.result as string) ?? "",
      sessionId: (raw.session_id as string) ?? "",
      durationMs: (raw.duration_ms as number) ?? 0,
      raw,
    };
  }
}
