# Milestone 4: Fix Deployment Bugs

## Problem

Two bugs prevent the bot from running on a Linux server:

1. **`claude` binary not found by execa** -- `execa` spawns a non-interactive shell that does not source `.bashrc`, so `claude` is not in PATH even though it is installed. Fix: add optional `claudePath` config field (defaults to `"claude"`).

2. **Session file path uses hardcoded absolute path** -- `SessionManager` attempts to create directories under a dev machine path instead of using `workspacePath` from config. Fix: ensure session file path derives from `workspacePath` at runtime.

## Success Criteria

- `claudePath` config option added (optional, defaults to `"claude"`)
- `ClaudeCodeAdapter` uses `claudePath` when spawning
- Session manager resolves `state/sessions.json` relative to `workspacePath` from config (no hardcoded paths)
- `config.example.json` updated with `claudePath` field
- All tests pass, typecheck passes, lint passes
