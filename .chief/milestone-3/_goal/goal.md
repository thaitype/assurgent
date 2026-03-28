# Milestone 3: Model Command, Session Override Refactor, and CLI Env Var

## Origin

Porting features from 3 new commits in the reference project (`agent-claw-wrapper`):

| Commit | Summary |
|--------|---------|
| `1d0df20` | Design doc: `/model` command and `session.override` object |
| `dd2190f` | Implementation: `/model` command, `session.override`, `/session list`, fixes |
| `5238b4c` | Pass `AGENT_SESSION_ID` env var to Claude Code CLI |

## Goal

Bring our app to feature parity with the reference project by implementing the following missing features:

### 1. Session Override Object Refactor

Replace `Session.turnLimitOverride?: number` with a structured `override` object:

```typescript
override?: {
  turnLimit?: number;  // set by /extend
  model?: string;      // set by /model
};
```

All references to `turnLimitOverride` must be updated to use `override?.turnLimit`.

### 2. `/model` Command

Add `/model [opus|sonnet|haiku|default]` command:

- No args: show current effective model and source (override vs config)
- Valid option: set `session.override.model`
- `default`: clear override, fall back to config model
- Invalid option: show error with valid options list
- No active session: show config model and instruct user to start a session first
- Export `SUPPORTED_MODELS` constant from `claude-code.ts`
- Wrapper imports and validates against `SUPPORTED_MODELS + "default"`

### 3. `/session list` Subcommand

- Move `/sessions` listing into `/session list` subcommand
- Remove standalone `/sessions` command handler
- Display format: `name (turns/limit, %, age)` instead of `name (turns, age)`

### 4. Session Command Fixes

- `/session rename`: validate non-empty name, respond with usage hint if empty
- `/session info`: show `Model: <effective model>` in output

### 5. Wrapper Constructor: Config Model

- Accept `configModel?: string` as 5th constructor parameter
- Pass from `config.agent["claude-code"]?.model` in `index.ts`
- Used as fallback when no session model override is set

### 6. Pass Model Override to Agent

- In `handleMessage`, pass `model: session.override?.model` to `agent.invoke()`

### 7. AGENT_SESSION_ID Env Var

- In `ClaudeCodeAdapter.invoke()`, pass `AGENT_SESSION_ID` env var set to `options.sessionId ?? ""`
- Allows skills/scripts inside Claude Code to access the session UUID

### 8. Debug Logging

- Add `console.log` statements to all command handlers and key message flow points
- Match the logging pattern from the reference project

## Out of Scope

- README updates (reference commit `5238b4c` includes README changes -- skip for now)
- Design report file (reference commit `1d0df20` adds `.chief/milestone-1/_report/model-command-design.md` -- this is reference material, not code)
- Changes to `.chief/_rules` or `.chief/milestone-1` from reference (those track the reference project's own planning state)
