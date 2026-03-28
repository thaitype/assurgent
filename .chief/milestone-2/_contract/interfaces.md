# Interface Contracts

These are the authoritative interface definitions for milestone-2. Implementations must conform exactly.

## ChatAdapter

File: `app/src/interfaces/chat-adapter.ts`

```typescript
export interface IncomingMessage {
  chatId: string;
  text: string;
  from: string;
  timestamp: number;
}

export interface ChatAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
  onMessage(handler: (msg: IncomingMessage) => Promise<void>): void;
  onCommand(command: string, handler: (msg: IncomingMessage, args: string) => Promise<void>): void;
  sendText(chatId: string, text: string): Promise<void>;
  sendTyping(chatId: string): Promise<void>;
  sendPlaceholder(chatId: string): Promise<number | undefined>;
  editMessage(chatId: string, messageId: number, text: string): Promise<void>;
}
```

## AgentAdapter

File: `app/src/interfaces/agent-adapter.ts`

```typescript
export interface AgentResponse {
  result: string;
  sessionId: string;
  durationMs: number;
  raw: Record<string, unknown>;
}

export interface AgentInvokeOptions {
  message: string;
  sessionId?: string;
  model?: string;
  maxTurns?: number;
  appendPrompt?: string;
}

export interface AgentAdapter {
  readonly name: string;
  invoke(options: AgentInvokeOptions): Promise<AgentResponse>;
}
```

## Config

File: `app/src/config.ts`

```typescript
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
    };
  };
  session: {
    turnLimit: number;
  };
  /** Absolute path to the workspace directory Claude Code runs in. */
  workspacePath: string;
}
```

## Session Types

File: `app/src/core/session-manager.ts`

```typescript
export interface Session {
  name: string;
  agentSessionId: string;
  chatId: string;
  createdAt: string;
  lastMessageAt: string;
  turnCount: number;
  turnLimitOverride?: number;
}

export interface SessionState {
  sessions: Record<string, Session>;
  activeSession: Record<string, string>;
}
```

## Contract Rules

- Adding optional fields to these interfaces is allowed without a contract change
- Removing or renaming fields requires updating this contract first
- All implementations must satisfy the full interface (no partial implementations)
