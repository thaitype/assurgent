import { Bot, InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import type { ChatAdapter, IncomingMessage } from "../interfaces/chat-adapter";
import { processMarkdown, sendWithFallback } from "./telegram-markdown";

export class TelegramAdapter implements ChatAdapter {
  private bot: Bot;
  private messageHandler?: (msg: IncomingMessage) => Promise<void>;
  private commandHandlers = new Map<
    string,
    (msg: IncomingMessage, args: string) => Promise<void>
  >();
  private callbackQueryHandler?: (chatId: string, data: string) => Promise<void>;

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

    this.bot.on("callback_query:data", async (ctx) => {
      if (!this.isAllowed(ctx.from?.id)) return;
      if (this.callbackQueryHandler) {
        const chatId = String(ctx.chat?.id ?? "");
        await this.callbackQueryHandler(chatId, ctx.callbackQuery.data);
      }
      await ctx.answerCallbackQuery();
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
    const { raw, escaped } = processMarkdown(text);
    for (let i = 0; i < raw.length; i++) {
      await sendWithFallback(
        (chunk, parseMode) =>
          this.bot.api
            .sendMessage(
              Number(chatId),
              chunk,
              parseMode ? { parse_mode: parseMode as "MarkdownV2" | "Markdown" } : {},
            )
            .then(() => {}),
        raw[i],
        escaped[i],
      );
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
    const { raw, escaped } = processMarkdown(text);

    // Edit the first chunk in the existing message
    await sendWithFallback(
      (chunk, parseMode) =>
        this.bot.api
          .editMessageText(
            Number(chatId),
            messageId,
            chunk,
            parseMode ? { parse_mode: parseMode as "MarkdownV2" | "Markdown" } : {},
          )
          .then(() => {}),
      raw[0],
      escaped[0],
    );

    // Send remaining chunks as new messages
    for (let i = 1; i < raw.length; i++) {
      await sendWithFallback(
        (chunk, parseMode) =>
          this.bot.api
            .sendMessage(
              Number(chatId),
              chunk,
              parseMode ? { parse_mode: parseMode as "MarkdownV2" | "Markdown" } : {},
            )
            .then(() => {}),
        raw[i],
        escaped[i],
      );
    }
  }

  async sendInlineKeyboard(
    chatId: string,
    text: string,
    buttons: Array<{ label: string; callbackData: string }>,
  ): Promise<void> {
    const keyboard = new InlineKeyboard();
    for (const btn of buttons) {
      keyboard.text(btn.label, btn.callbackData);
    }
    await this.bot.api.sendMessage(Number(chatId), text, {
      reply_markup: keyboard,
    });
  }

  onCallbackQuery(handler: (chatId: string, data: string) => Promise<void>): void {
    this.callbackQueryHandler = handler;
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
