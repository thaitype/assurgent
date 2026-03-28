import path from "node:path";
import { ClaudeCodeAdapter } from "./agent/claude-code";
import { TelegramAdapter } from "./chat/telegram";
import type { Config } from "./config";
import { loadConfig } from "./config";
import { SessionManager } from "./core/session-manager";
import { Wrapper } from "./core/wrapper";
import type { AgentAdapter } from "./interfaces/agent-adapter";
import type { ChatAdapter } from "./interfaces/chat-adapter";

const config = loadConfig();

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
      return new ClaudeCodeAdapter(cfg.agent["claude-code"], cfg.workspacePath);
    default:
      throw new Error(`Unknown agent adapter: ${cfg.agent.adapter}`);
  }
}

const chat = createChatAdapter(config);
const agent = createAgentAdapter(config);
const sessions = new SessionManager({
  statePath: path.join(config.workspacePath, "state"),
});

const wrapper = new Wrapper(
  chat,
  agent,
  sessions,
  config.session.turnLimit,
  config.agent["claude-code"]?.model,
);
await wrapper.start();
