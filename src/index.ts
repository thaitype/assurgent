import path from "node:path";
import { ClaudeCodeAdapter } from "./agent/claude-code";
import { TelegramAdapter } from "./chat/telegram";
import type { Config } from "./config";
import { getAssurgentHome, loadConfig } from "./config";
import { SessionManager } from "./core/session-manager";
import { Wrapper } from "./core/wrapper";
import type { AgentAdapter } from "./interfaces/agent-adapter";
import type { ChatAdapter } from "./interfaces/chat-adapter";
import { createProxy } from "./proxy/proxy";

const { config, resolvedSecrets } = await loadConfig();

console.log(`Workspace: ${config.workspacePath}`);

function createChatAdapter(cfg: Config): ChatAdapter {
  switch (cfg.chat.adapter) {
    case "telegram":
      return new TelegramAdapter(cfg.chat.telegram);
    default:
      throw new Error(`Unknown chat adapter: ${cfg.chat.adapter}`);
  }
}

function createAgentAdapter(cfg: Config): AgentAdapter {
  switch (cfg.agent.adapter) {
    case "claude-code":
      return new ClaudeCodeAdapter(
        {
          ...cfg.agent["claude-code"],
          blacklistEnv: cfg.security?.blacklistEnv,
        },
        cfg.workspacePath,
      );
    default:
      throw new Error(`Unknown agent adapter: ${cfg.agent.adapter}`);
  }
}

const chat = createChatAdapter(config);
const agent = createAgentAdapter(config);
const sessions = new SessionManager({
  statePath: path.join(getAssurgentHome(), "state"),
});

// Conditionally start the secret proxy if configured
if (config.proxy) {
  console.log(`Secret proxy listening on 127.0.0.1:${config.proxy.port ?? 9090}`);
  createProxy(config.proxy, resolvedSecrets);
}

const wrapper = new Wrapper(
  chat,
  agent,
  sessions,
  config.session.turnLimit,
  config.agent["claude-code"]?.model,
);
await wrapper.start();
