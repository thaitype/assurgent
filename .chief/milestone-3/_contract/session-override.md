# Contract: Session Override Object

## Session Interface (replaces `turnLimitOverride`)

```typescript
export interface Session {
  name: string;
  agentSessionId: string;
  chatId: string;
  createdAt: string;
  lastMessageAt: string;
  turnCount: number;
  override?: {
    turnLimit?: number;  // set by /extend
    model?: string;      // set by /model
  };
}
```

## SessionManager New Method

```typescript
/** Set or clear the model override for the active session. */
setModelOverride(chatId: string, model: string | undefined): boolean;
```

## SUPPORTED_MODELS Constant

```typescript
// src/agent/claude-code.ts
export const SUPPORTED_MODELS = ["opus", "sonnet", "haiku"] as const;
```

The wrapper adds `"default"` as a synthetic option on top.

## Wrapper Constructor Change

```typescript
constructor(
  chat: ChatAdapter,
  agent: AgentAdapter,
  sessions: SessionManager,
  turnLimit: number,
  configModel?: string,  // NEW -- 5th parameter
)
```

## AGENT_SESSION_ID Env Var

```typescript
// In ClaudeCodeAdapter.invoke()
env: {
  ...process.env,
  AGENT_SESSION_ID: options.sessionId ?? "",
},
```
