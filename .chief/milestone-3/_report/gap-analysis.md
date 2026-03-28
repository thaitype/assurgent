# Gap Analysis: Reference Project vs Our App

## Reference Commits Analyzed

| Commit | Date | Summary |
|--------|------|---------|
| `1d0df20` | 2026-03-15 21:30 | Design doc for /model command and session.override |
| `dd2190f` | 2026-03-15 21:52 | Implementation of /model, session.override, /session fixes |
| `5238b4c` | 2026-03-15 23:18 | AGENT_SESSION_ID env var to Claude Code CLI |

## Features Missing in Our App

### 1. Session Override Object (structural change)

**Reference:** `Session.turnLimitOverride` replaced with `Session.override?: { turnLimit?: number; model?: string; }`
**Our app:** Still uses flat `turnLimitOverride?: number`
**Impact:** All files referencing `turnLimitOverride` (session-manager.ts, wrapper.ts)

### 2. SUPPORTED_MODELS Export

**Reference:** `export const SUPPORTED_MODELS = ["opus", "sonnet", "haiku"] as const;` in `claude-code.ts`
**Our app:** Not present
**Impact:** claude-code.ts, wrapper.ts (imports it for validation)

### 3. setModelOverride Method

**Reference:** `SessionManager.setModelOverride(chatId, model)` added
**Our app:** Not present
**Impact:** session-manager.ts

### 4. /model Command

**Reference:** Full `/model [opus|sonnet|haiku|default]` handler in wrapper
**Our app:** Not present
**Impact:** wrapper.ts (new `handleModelCommand` method + command registration)

### 5. /session list Subcommand

**Reference:** Standalone `/sessions` replaced with `/session list` case inside `handleSessionCommand`
**Our app:** Still has standalone `/sessions` handler
**Impact:** wrapper.ts (remove `/sessions`, add `list` case to switch)

### 6. /session list Display Format

**Reference:** `name (turns/limit, %, age)` with percentage
**Our app:** `name (turns, age)` without limit or percentage
**Impact:** wrapper.ts

### 7. /session rename Validation

**Reference:** Empty name check: `if (!value)` returns usage hint
**Our app:** No validation, accepts empty name
**Impact:** wrapper.ts

### 8. /session info Model Display

**Reference:** Shows `Model: <effective model>` in session info
**Our app:** Does not show model
**Impact:** wrapper.ts

### 9. configModel in Wrapper

**Reference:** 5th constructor param `configModel?: string`, passed from `config.agent["claude-code"]?.model` in index.ts
**Our app:** Wrapper only takes 4 params, no configModel
**Impact:** wrapper.ts, index.ts

### 10. Model Override Passed to agent.invoke()

**Reference:** `model: session.override?.model` passed in handleMessage
**Our app:** No model passed to invoke
**Impact:** wrapper.ts

### 11. AGENT_SESSION_ID Env Var

**Reference:** `env: { ...process.env, AGENT_SESSION_ID: options.sessionId ?? "" }` in execa call
**Our app:** No env override in execa call
**Impact:** claude-code.ts

### 12. Debug Logging

**Reference:** `console.log` added to all command handlers and key message flow points
**Our app:** Minimal logging (only session resolve and agent invoke)
**Impact:** wrapper.ts

## Features Already Present (No Action Needed)

- `AgentInvokeOptions.model` field -- already exists in our interface
- `buildArgs` model passthrough -- already implemented
- Placeholder message support -- already implemented
- Per-chat message queue -- already implemented
- Turn limit pause with /extend -- already implemented (just needs override refactor)
