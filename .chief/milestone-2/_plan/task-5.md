# Task 5: Implement Claude Code Adapter, Core Wrapper, and Entry Point

## Objective

Create the agent adapter (Claude Code CLI), the core wrapper (message routing + session orchestration), and the entry point that wires everything together.

## Scope

- Create `app/src/agent/claude-code.ts`
- Create `app/src/agent/claude-code.test.ts`
- Create `app/src/core/wrapper.ts`
- Update `app/src/index.ts` to be the real entry point

## Rules & Contracts to Follow

- `.chief/milestone-2/_contract/interfaces.md` -- AgentAdapter interface
- `.chief/milestone-2/_contract/config-schema.md` -- config structure
- `.chief/_rules/_standard/typescript.md` -- coding standards

## Steps

1. Create `src/agent/claude-code.ts` with:
   - `ClaudeCodeConfig` interface: `{ model, maxTurns, flags }`
   - `buildArgs(config, options): string[]` -- exported pure function that builds CLI args for `claude -p`
   - `ClaudeCodeAdapter` class implementing `AgentAdapter`
   - Constructor takes `(config: ClaudeCodeConfig, workspacePath: string)`
   - `invoke()` -- spawns `claude` via execa with the built args, parses JSON output, returns `AgentResponse`
   - Timeout: 180 seconds
2. Create `src/agent/claude-code.test.ts` testing:
   - `buildArgs` with basic message (no session)
   - `buildArgs` with sessionId (adds --resume)
   - `buildArgs` with model override
   - `buildArgs` with appendPrompt
   - `buildArgs` with custom flags
3. Create `src/core/wrapper.ts` with:
   - `Wrapper` class taking `(chat, agent, sessions, turnLimit)`
   - `start()` -- registers commands (/new, /extend, /session, /sessions, /help) and message handler
   - Per-chat message queue to prevent concurrent agent invocations
   - `handleMessage()` -- resolve session, send placeholder/typing, invoke agent, update session, send response, check turn limit
   - Turn limit enforcement with pause/unpause per chat
   - All commands from reference: /new, /extend [N], /session resume|rename|info, /sessions, /help
4. Update `src/index.ts`:
   - Load config from `app/config.json`
   - Create TelegramAdapter, ClaudeCodeAdapter, SessionManager
   - Create Wrapper and start it
   - Session state path: `state/` relative to assurgent repo root (derived from config.workspacePath)

## Acceptance Criteria

- `buildArgs` produces correct CLI argument arrays
- Wrapper registers all commands and routes messages correctly
- Turn limit pauses the chat and requires /extend or /new
- Entry point wires all components and starts the bot
- All tests pass
- Type check and lint pass

## Verification

```bash
cd app && bun run typecheck && bun test && bun run lint
```

## Deliverables

- `app/src/agent/claude-code.ts`
- `app/src/agent/claude-code.test.ts`
- `app/src/core/wrapper.ts`
- `app/src/index.ts` (updated)
