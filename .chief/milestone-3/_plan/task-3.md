# Task 3: AGENT_SESSION_ID Env Var + Debug Logging

## Objective

Pass `AGENT_SESSION_ID` environment variable to the Claude Code CLI process, and add debug `console.log` statements throughout command handlers and message flow.

## Scope

**Files to modify:**
- `src/agent/claude-code.ts`
- `src/core/wrapper.ts`

## Rules & Contracts

- `.chief/milestone-3/_goal/goal.md` (sections 7-8)
- `.chief/_rules/_standard/typescript.md`

## Steps

### claude-code.ts

1. In `invoke()`, add `env` option to the `execa` call:
   ```typescript
   env: {
     ...process.env,
     AGENT_SESSION_ID: options.sessionId ?? "",
   },
   ```

### wrapper.ts

1. Add `console.log` at the start and end of each command handler:
   - `/new`: log chatId at start, "done" at end
   - `/extend`: log chatId + args at start, result at end
   - `/session`: log chatId + args at start, "done" at end
   - `/model`: log chatId + args at start, "done" at end
   - `/help`: log chatId at start, "done" at end
2. Add logging in `handleMessage`:
   - Log when paused (re-sending notification)
   - Log placeholderId
   - Log when editing placeholder vs sending new message
3. Add logging in `handleSessionCommand`:
   - Log action and value
   - Log result of each case (list count, resume found, rename result, info active)
4. Add logging for turn limit reached in `handleMessage`

## Acceptance Criteria

- `AGENT_SESSION_ID` env var is set when spawning claude CLI
- All command handlers have entry/exit logging
- Key decision points in message flow are logged
- Logging matches the pattern from reference commits

## Verification

```bash
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- Modified `src/agent/claude-code.ts`
- Modified `src/core/wrapper.ts`
