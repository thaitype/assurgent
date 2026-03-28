# Task 4: Env Var Blacklist in claude-code.ts

## Objective

Implement configurable env var blacklist filtering in the Claude Code agent adapter so that blacklisted environment variables are stripped before spawning the child process.

## Scope

**Included:**
- Update `src/agent/claude-code.ts` to read `security.blacklistEnv` from config
- Filter `process.env` using the blacklist before passing to execa
- Unit tests for blacklist filtering

**Excluded:**
- Config schema changes (done in task-3)
- Secret provider implementation (task-1, task-2)

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md`
- `.chief/_rules/_verification/verification.md`
- `.chief/milestone-5/_contract/config-secret-ref.md` (security.blacklistEnv schema)
- `.chief/milestone-5/_report/secret-access-discussion.md` (env stripping requirement)

## Steps

1. Update `ClaudeCodeAdapter` constructor or invoke method to accept/read `blacklistEnv` config.
2. In the `invoke` method, before spawning execa:
   - Create a `Set` from `config.security?.blacklistEnv ?? []`.
   - Filter `process.env` to exclude blacklisted keys.
   - Pass the filtered env to execa.
3. Write unit tests verifying:
   - Blacklisted vars are not passed to child process.
   - Non-blacklisted vars are passed through.
   - Empty blacklist passes all vars.

## Acceptance Criteria

- Blacklisted env vars do not appear in the child process environment.
- Non-blacklisted env vars are passed through unchanged.
- Empty or missing `blacklistEnv` config results in no filtering (all vars passed).
- No hardcoded env var names -- the list is fully configurable.

## Verification

```bash
cd app && bun test src/agent/
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- Updated `src/agent/claude-code.ts`
- `src/agent/claude-code.test.ts` (new or updated)
