/**
 * Represents a message received from a chat platform.
 */
export interface IncomingMessage {
  chatId: string;
  text: string;
  from: string;
  timestamp: number;
}

/**
 * Adapter contract for a chat platform integration.
 * Implementations handle lifecycle, message routing, and sending.
 */
export interface ChatAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
  onMessage(handler: (msg: IncomingMessage) => Promise<void>): void;
  onCommand(command: string, handler: (msg: IncomingMessage, args: string) => Promise<void>): void;
  sendText(chatId: string, text: string): Promise<void>;
  sendTyping(chatId: string): Promise<void>;
  /** Send a placeholder message, return its ID for later editing. Returns undefined if not supported. */
  sendPlaceholder(chatId: string): Promise<number | undefined>;
  /** Edit a previously sent message by ID. */
  editMessage(chatId: string, messageId: number, text: string): Promise<void>;
  /** Send an inline keyboard with buttons. Returns undefined if not supported. */
  sendInlineKeyboard(
    chatId: string,
    text: string,
    buttons: Array<{ label: string; callbackData: string }>,
  ): Promise<void>;
  /** Register a handler for inline keyboard callback queries. */
  onCallbackQuery(handler: (chatId: string, data: string) => Promise<void>): void;
}
