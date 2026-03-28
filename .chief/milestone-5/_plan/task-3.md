# Task 3: Async loadConfig with Secret Resolution + Config Schema Updates

## Objective

Make `loadConfig` always async and integrate secret resolution into the config loading pipeline. Update the `Config` type to include `secrets`, `security`, and `proxy` fields.

## Scope

**Included:**
- Update `src/config.ts`: add `secrets`, `security.blacklistEnv`, and `proxy` to Config type
- Make `loadConfig()` always async (one code path)
- Integrate `resolveSecrets()` call between JSON parse and validation
- Update `src/index.ts` to await `loadConfig()`
- Update validation to check secretRef pre/post-resolution rules

**Excluded:**
- SecretProvider implementation (task-1, task-2)
- Proxy server implementation (task-5)
- Env var blacklist implementation in claude-code.ts (task-4)

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md`
- `.chief/_rules/_verification/verification.md`
- `.chief/milestone-5/_contract/config-secret-ref.md` (validation rules, loadConfig flow)

## Steps

1. Update `Config` interface in `src/config.ts`:
   - Add optional `secrets` block (providers map + entries map).
   - Add optional `security` block with `blacklistEnv: string[]`.
   - Add optional `proxy` block with `port`, `bypassWhitelist`, `whitelist`.
2. Change `loadConfig` signature to `async function loadConfig(...): Promise<Config>`.
3. In `loadConfig`, after `JSON.parse`:
   - If `raw.secrets` exists, call `createProviders()` and `resolveSecrets()`.
   - Dispose providers after resolution.
   - Always async even if no secrets block.
4. Add pre-resolution validation: if handlebars found but no `secrets` block, throw.
5. Add post-resolution validation: if any `${{secretRef.*}}` remain, throw.
6. Update `src/index.ts` to `await loadConfig()`.
7. Update existing tests for async loadConfig.

## Acceptance Criteria

- `loadConfig` is always async with `Promise<Config>` return type.
- Config with no secrets block works (backward compatible).
- Config with secrets block resolves all handlebars before validation.
- Handlebars without secrets block throws clear error.
- Unresolved handlebars after resolution throws clear error.
- All existing tests pass after async migration.

## Verification

```bash
cd app && bun test
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- Updated `src/config.ts`
- Updated `src/index.ts`
- Updated existing config tests
