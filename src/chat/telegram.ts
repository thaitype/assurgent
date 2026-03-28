import { Bot } from "grammy";
import type { Context } from "grammy";
import type { ChatAdapter, IncomingMessage } from "../interfaces/chat-adapter";

/**
 * Splits a text string into chunks of at most maxLength characters.
 * Prefers splitting at the last newline before maxLength.
 * If no newline is found, splits at maxLength.
 * Trims leading whitespace from subsequent chunks.
 */
export function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    let splitAt = remaining.lastIndexOf("\n", maxLength);
    if (splitAt <= 0) splitAt = maxLength;

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return chunks;
}

export class TelegramAdapter implements ChatAdapter {
  private bot: Bot;
  private messageHandler?: (msg: IncomingMessage) => Promise<void>;
  private commandHandlers = new Map<
    string,
    (msg: IncomingMessage, args: string) => Promise<void>
  >();

  constructor(
    private config: {
      botToken: string;
      allowedUserIds: string[];
      placeholder?: { enabled: boolean; text: string };
    },
  ) {
    this.bot = new Bot(config.botToken);
  }

  async start(): Promise<void> {
    for (const [cmd, handler] of this.commandHandlers) {
      this.bot.command(cmd, async (ctx) => {
        if (!this.isAllowed(ctx.from?.id)) return;
        const msg = this.toIncoming(ctx);
        await handler(msg, ctx.match ?? "");
      });
    }

    this.bot.on("message:text", async (ctx) => {
      if (!this.isAllowed(ctx.from?.id)) return;
      if (ctx.message?.text?.startsWith("/")) return;
      if (this.messageHandler) {
        await this.messageHandler(this.toIncoming(ctx));
      }
    });

    this.bot.start();
  }

  async stop(): Promise<void> {
    await this.bot.stop();
  }

  onMessage(handler: (msg: IncomingMessage) => Promise<void>): void {
    this.messageHandler = handler;
  }

  onCommand(command: string, handler: (msg: IncomingMessage, args: string) => Promise<void>): void {
    this.commandHandlers.set(command, handler);
  }

  async sendText(chatId: string, text: string): Promise<void> {
    const chunks = splitMessage(text, 4000);
    for (const chunk of chunks) {
      try {
        await this.bot.api.sendMessage(Number(chatId), chunk, { parse_mode: "Markdown" });
      } catch {
        await this.bot.api.sendMessage(Number(chatId), chunk);
      }
    }
  }

  async sendTyping(chatId: string): Promise<void> {
    await this.bot.api.sendChatAction(Number(chatId), "typing");
  }

  async sendPlaceholder(chatId: string): Promise<number | undefined> {
    if (!this.config.placeholder?.enabled) return undefined;
    const msg = await this.bot.api.sendMessage(Number(chatId), this.config.placeholder.text);
    return msg.message_id;
  }

  async editMessage(chatId: string, messageId: number, text: string): Promise<void> {
    const chunks = splitMessage(text, 4000);
    try {
      await this.bot.api.editMessageText(Number(chatId), messageId, chunks[0], {
        parse_mode: "Markdown",
      });
    } catch {
      await this.bot.api.editMessageText(Number(chatId), messageId, chunks[0]);
    }
    for (let i = 1; i < chunks.length; i++) {
      try {
        await this.bot.api.sendMessage(Number(chatId), chunks[i], { parse_mode: "Markdown" });
      } catch {
        await this.bot.api.sendMessage(Number(chatId), chunks[i]);
      }
    }
  }

  private isAllowed(userId?: number): boolean {
    if (!userId) return false;
    return this.config.allowedUserIds.includes(String(userId));
  }

  private toIncoming(ctx: Context): IncomingMessage {
    return {
      chatId: String(ctx.chat?.id ?? ""),
      text: ctx.message?.text ?? "",
      from: String(ctx.from?.id ?? ""),
      timestamp: ctx.message?.date ?? Date.now(),
    };
  }
}
