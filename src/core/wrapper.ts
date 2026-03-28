import { SUPPORTED_MODELS } from "../agent/claude-code";
import type { AgentAdapter } from "../interfaces/agent-adapter";
import type { ChatAdapter, IncomingMessage } from "../interfaces/chat-adapter";
import type { SessionManager } from "./session-manager";

export class Wrapper {
  private chatQueues = new Map<string, Promise<void>>();
  private pausedChats = new Set<string>();

  constructor(
    private chat: ChatAdapter,
    private agent: AgentAdapter,
    private sessions: SessionManager,
    private turnLimit: number,
    private configModel?: string,
  ) {}

  async start(): Promise<void> {
    this.chat.onCommand("new", async (msg) => {
      console.log(`[cmd] /new chatId=${msg.chatId}`);
      this.pausedChats.delete(msg.chatId);
      this.sessions.archiveActive(msg.chatId);
      await this.chat.sendText(msg.chatId, "Session archived. Next message starts fresh.");
      console.log("[cmd] /new done");
    });

    this.chat.onCommand("extend", async (msg, args) => {
      console.log(`[cmd] /extend chatId=${msg.chatId} args="${args}"`);
      const n = Number.parseInt(args.trim(), 10) || this.turnLimit;
      const extended = this.sessions.extendSession(msg.chatId, n, this.turnLimit);
      if (extended) {
        this.pausedChats.delete(msg.chatId);
        await this.chat.sendText(msg.chatId, `Session extended by ${n} turns.`);
      } else {
        await this.chat.sendText(msg.chatId, "No active session to extend.");
      }
      console.log(`[cmd] /extend done extended=${extended}`);
    });

    this.chat.onCommand("session", async (msg, args) => {
      console.log(`[cmd] /session chatId=${msg.chatId} args="${args}"`);
      await this.handleSessionCommand(msg, args);
      console.log("[cmd] /session done");
    });

    this.chat.onCommand("model", async (msg, args) => {
      console.log(`[cmd] /model chatId=${msg.chatId} args="${args}"`);
      await this.handleModelCommand(msg, args);
      console.log("[cmd] /model done");
    });

    this.chat.onCommand("help", async (msg) => {
      console.log(`[cmd] /help chatId=${msg.chatId}`);
      await this.chat.sendText(
        msg.chatId,
        [
          "Available commands:",
          "/new — Start new session",
          "/extend [N] — Extend session by N turns (default: config turnLimit)",
          "/model [opus|sonnet|haiku|default] — Show or set model for current session",
          "/session list — List all sessions",
          "/session resume <name> — Resume a session",
          "/session rename <name> — Rename current session",
          "/session info — Current session info",
          "/help — This message",
        ].join("\n"),
      );
      console.log("[cmd] /help done");
    });

    this.chat.onMessage(async (msg) => {
      console.log(
        `[message] from=${msg.from} chatId=${msg.chatId} text="${msg.text.slice(0, 50)}"`,
      );
      await this.enqueue(msg.chatId, () => this.handleMessage(msg));
    });

    await this.chat.start();
    console.log(`Wrapper started (chat: ${this.chat.constructor.name}, agent: ${this.agent.name})`);
  }

  /** Enqueue a task per chatId so messages are processed sequentially. */
  private async enqueue(chatId: string, fn: () => Promise<void>): Promise<void> {
    const prev = this.chatQueues.get(chatId) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    this.chatQueues.set(chatId, next);
    await next;
  }

  private async handleMessage(msg: IncomingMessage): Promise<void> {
    if (this.pausedChats.has(msg.chatId)) {
      console.log("[message] paused — resending turn limit notification");
      await this.sendTurnLimitNotification(msg.chatId);
      return;
    }

    const placeholderId = await this.chat.sendPlaceholder(msg.chatId);
    if (!placeholderId) {
      await this.chat.sendTyping(msg.chatId);
    }
    console.log(`[message] placeholderId=${placeholderId ?? "none"}`);

    const session = this.sessions.resolveSession(msg.chatId, msg.text);
    console.log(
      `[session] name=${session.name} agentSessionId=${session.agentSessionId || "(new)"}`,
    );

    try {
      console.log("[agent] invoking...");
      const response = await this.agent.invoke({
        message: msg.text,
        sessionId: session.agentSessionId || undefined,
        model: session.override?.model,
      });
      console.log(`[agent] done (${response.durationMs}ms, sessionId=${response.sessionId})`);

      const newTurnCount = session.turnCount + 1;

      this.sessions.updateSession(session.name, {
        agentSessionId: response.sessionId,
        lastMessageAt: new Date().toISOString(),
        turnCount: newTurnCount,
      });

      if (placeholderId) {
        console.log("[message] editing placeholder with response");
        await this.chat.editMessage(msg.chatId, placeholderId, response.result);
      } else {
        await this.chat.sendText(msg.chatId, response.result);
      }

      const effectiveLimit = session.override?.turnLimit ?? this.turnLimit;
      if (newTurnCount >= effectiveLimit) {
        console.log(`[session] turn limit reached (${newTurnCount}/${effectiveLimit}), pausing`);
        this.pausedChats.add(msg.chatId);
        await this.sendTurnLimitNotification(msg.chatId);
      }
    } catch (error) {
      console.error("[agent] error:", error);
      await this.chat.sendText(
        msg.chatId,
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async sendTurnLimitNotification(chatId: string): Promise<void> {
    const session = this.sessions.getActive(chatId);
    const limit = session?.override?.turnLimit ?? this.turnLimit;
    await this.chat.sendText(
      chatId,
      `Session reached ${limit} turns. Send /extend N to continue, or /new to start fresh.`,
    );
  }

  private async handleSessionCommand(msg: IncomingMessage, args: string): Promise<void> {
    const [action, ...rest] = args.trim().split(/\s+/);
    const value = rest.join(" ");
    console.log(`[cmd] /session action="${action}" value="${value}"`);

    switch (action) {
      case "list": {
        const list = this.sessions.listSessions(msg.chatId);
        const text =
          list.length === 0
            ? "No sessions yet."
            : list
                .map((s) => {
                  const limit = s.override?.turnLimit ?? this.turnLimit;
                  const pct = Math.round((s.turnCount / limit) * 100);
                  return `- ${s.name} (${s.turnCount}/${limit} turns, ${pct}%, ${this.timeAgo(s.lastMessageAt)})`;
                })
                .join("\n");
        await this.chat.sendText(msg.chatId, text);
        console.log(`[cmd] /session list count=${list.length}`);
        break;
      }
      case "resume": {
        this.pausedChats.delete(msg.chatId);
        const found = this.sessions.setActive(msg.chatId, value);
        if (found) {
          await this.chat.sendText(msg.chatId, `Resumed session: ${value}`);
        } else {
          await this.chat.sendText(msg.chatId, `Session "${value}" not found.`);
        }
        console.log(`[cmd] /session resume found=${found}`);
        break;
      }
      case "rename": {
        if (!value) {
          await this.chat.sendText(msg.chatId, "Usage: /session rename <name>");
          break;
        }
        const renamed = this.sessions.renameActive(msg.chatId, value);
        if (renamed) {
          await this.chat.sendText(msg.chatId, `Session renamed to: ${value}`);
        } else {
          await this.chat.sendText(msg.chatId, "No active session to rename.");
        }
        console.log(`[cmd] /session rename renamed=${renamed}`);
        break;
      }
      default: {
        const current = this.sessions.getActive(msg.chatId);
        if (current) {
          const effectiveLimit = current.override?.turnLimit ?? this.turnLimit;
          const effectiveModel = current.override?.model ?? this.configModel ?? "default";
          await this.chat.sendText(
            msg.chatId,
            [
              `Session: ${current.name}`,
              `Turns: ${current.turnCount} / ${effectiveLimit}`,
              `Model: ${effectiveModel}`,
              `Started: ${this.timeAgo(current.createdAt)}`,
              `Last active: ${this.timeAgo(current.lastMessageAt)}`,
            ].join("\n"),
          );
        } else {
          await this.chat.sendText(msg.chatId, "No active session.");
        }
        console.log(`[cmd] /session info active=${!!current}`);
        break;
      }
    }
  }

  private async handleModelCommand(msg: IncomingMessage, args: string): Promise<void> {
    const value = args.trim().toLowerCase();

    const session = this.sessions.getActive(msg.chatId);

    if (!value) {
      const effectiveModel = session?.override?.model ?? this.configModel ?? "default";
      if (!session) {
        await this.chat.sendText(
          msg.chatId,
          `No active session. Current config model: ${effectiveModel}\nSend a message to start a session, then use /model to change the model.`,
        );
      } else {
        const source = session.override?.model ? "session override" : "config default";
        await this.chat.sendText(msg.chatId, `Current model: ${effectiveModel} (${source})`);
      }
      return;
    }

    if (!session) {
      await this.chat.sendText(
        msg.chatId,
        "No active session. Send a message to start one, then use /model to change the model.",
      );
      return;
    }

    const validOptions = ["default", ...SUPPORTED_MODELS] as const;
    if (!(validOptions as readonly string[]).includes(value)) {
      await this.chat.sendText(
        msg.chatId,
        `Invalid model "${value}". Valid options: ${validOptions.join(", ")}`,
      );
      return;
    }

    if (value === "default") {
      this.sessions.setModelOverride(msg.chatId, undefined);
      const fallback = this.configModel ?? "CLI default";
      await this.chat.sendText(msg.chatId, `Model reset to default (${fallback}).`);
    } else {
      this.sessions.setModelOverride(msg.chatId, value);
      await this.chat.sendText(msg.chatId, `Model set to: ${value}`);
    }
  }

  private timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
}
