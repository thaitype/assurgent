# Task 2: /model Command, /session list, and Session Command Fixes

## Objective

Add the `/model` command, replace `/sessions` with `/session list`, fix `/session rename` validation, show model in `/session info`, and wire `configModel` into the Wrapper.

## Scope

**Files to modify:**
- `src/core/wrapper.ts`
- `src/index.ts`

## Rules & Contracts

- `.chief/milestone-3/_contract/session-override.md`
- `.chief/milestone-3/_goal/goal.md` (sections 2-6)
- `.chief/_rules/_standard/typescript.md`

## Steps

### wrapper.ts

1. Import `SUPPORTED_MODELS` from `../agent/claude-code`
2. Add `configModel?: string` as 5th constructor parameter
3. Remove the `/sessions` command handler entirely
4. Add `/session list` case inside `handleSessionCommand`:
   - Show `name (turns/limit, %, age)` format
5. Add `/model` command registration in `start()` that calls `handleModelCommand`
6. Implement `handleModelCommand(msg, args)`:
   - No args: show effective model + source
   - `default`: clear override via `sessions.setModelOverride(chatId, undefined)`
   - Valid model: set via `sessions.setModelOverride(chatId, value)`
   - Invalid: error with valid options
   - No active session: show config model, instruct to start session first
7. In `/session rename` case: check `if (!value)` and respond with usage hint
8. In `/session info` (default case): add `Model: <effective>` line
9. Update all `turnLimitOverride` references to `override?.turnLimit`
10. In `handleMessage`: pass `model: session.override?.model` to `agent.invoke()`
11. Update `sendTurnLimitNotification` to use `override?.turnLimit`
12. Update `/help` text: replace `/sessions` with `/session list`, add `/model`

### index.ts

1. Pass `config.agent["claude-code"]?.model` as 5th arg to Wrapper constructor

## Acceptance Criteria

- `/model` command works: show, set, clear, validate
- `/sessions` command removed; `/session list` works with turns/limit/percentage
- `/session rename` rejects empty name
- `/session info` shows model
- `configModel` flows from config to wrapper
- Model override passed to `agent.invoke()`
- All `turnLimitOverride` references replaced with `override?.turnLimit`

## Verification

```bash
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- Modified `src/core/wrapper.ts`
- Modified `src/index.ts`
