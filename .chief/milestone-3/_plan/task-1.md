# Task 1: Refactor Session Override + SUPPORTED_MODELS

## Objective

Replace the flat `turnLimitOverride` field with the structured `override` object on `Session`, add `setModelOverride` to `SessionManager`, and export `SUPPORTED_MODELS` from the Claude Code adapter.

## Scope

**Files to modify:**
- `src/core/session-manager.ts`
- `src/agent/claude-code.ts`

**Excluded:** wrapper.ts, index.ts (handled in task-2 and task-3)

## Rules & Contracts

- `.chief/milestone-3/_contract/session-override.md`
- `.chief/_rules/_standard/typescript.md`

## Steps

1. In `src/core/session-manager.ts`:
   - Replace `turnLimitOverride?: number` with `override?: { turnLimit?: number; model?: string; }` on the `Session` interface
   - Update `extendSession` to read from `session.override?.turnLimit` and write to `session.override = { ...session.override, turnLimit: ... }`
   - Add `setModelOverride(chatId, model)` method that sets or clears `session.override.model`

2. In `src/agent/claude-code.ts`:
   - Add `export const SUPPORTED_MODELS = ["opus", "sonnet", "haiku"] as const;` before the `ClaudeCodeConfig` interface

## Acceptance Criteria

- `Session` interface uses `override?` object, not `turnLimitOverride`
- `extendSession` works correctly with the new structure
- `setModelOverride` sets and clears model override
- `SUPPORTED_MODELS` is exported from `claude-code.ts`
- TypeScript compiles without errors (type check may fail until task-2 updates wrapper references)

## Verification

```bash
cd app && bun run typecheck  # may have errors in wrapper.ts until task-2
```

## Deliverables

- Modified `src/core/session-manager.ts`
- Modified `src/agent/claude-code.ts`
