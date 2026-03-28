# Milestone 2 — Telegram Chat Wrapper for assurgent

## What

Build a Telegram bot that wraps the Claude Code CLI, allowing the user to chat with Claude Code from Telegram on their phone. The bot forwards messages to `claude -p`, manages sessions, and returns responses.

## Why

The user needs mobile access to Claude Code for quick tasks, questions, and brain interactions without sitting at a terminal. This bridges Telegram to the existing assurgent workspace.

## Key Differences from Reference (agent-claw-wrapper)

The reference project (`agent-claw-wrapper`) uses external profile directories (`~/.agent-claw/<profile>/workspace/`). This project is different:

- **Workspace is the assurgent repo itself.** Claude Code runs with `cwd` set to the assurgent repo root (the project root), not an isolated external workspace.
- **No profile system.** Single-user, single-workspace. No `~/.agent-claw/` directory.
- **Config lives in the app directory.** `app/config.json` (gitignored) for secrets, with `app/config.example.json` committed as a template.
- **Session state lives in `state/`.** The assurgent project already defines `state/` for operational data. Sessions go to `state/sessions.json`.
- **Code lives in `app/src/`.** Source code for the bot lives inside the app directory.

## Architectural Patterns to Keep from Reference

- **Adapter pattern.** `ChatAdapter` and `AgentAdapter` interfaces for pluggability.
- **Core wrapper.** Routes messages between chat and agent. Does not duplicate agent logic.
- **Session manager.** Maps friendly names to agent session IDs. Turn limit with extend/new.
- **Message queuing.** Per-chat sequential message processing to prevent concurrent agent invocations.
- **Message splitting.** Long responses split at newlines for Telegram's 4096 char limit.

## Tech Stack

- Runtime: Bun
- Language: TypeScript (strict mode)
- Chat: grammy (Telegram Bot API)
- Process execution: execa (spawns `claude -p`)
- Linter/Formatter: Biome
- Config: config.json (no .env files)

## Scope Boundaries

### In scope
- Telegram bot receiving text messages and commands
- Claude Code CLI invocation via `claude -p --output-format json`
- Session management (create, resume, archive, rename, extend)
- Turn limit enforcement
- Allowed user ID filtering
- Placeholder/typing indicator support
- Message chunking for long responses

### Out of scope
- Multi-profile support
- Other chat platforms (Discord, LINE)
- Other agent backends (Codex, Aider)
- Media/file handling (images, voice, documents)
- Cost tracking or usage limits beyond turn counts
- Web UI or dashboard
