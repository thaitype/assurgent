# Milestone 5 Review Report

**Reviewer:** chief-agent
**Date:** 2026-03-28
**Scope:** All code implemented for milestone-5 (secret providers, resolver, proxy, env blacklist, config changes)

---

## Summary

Milestone-5 implements multi-provider secret resolution, env var blacklist filtering, and a generic secret proxy. All 7 tasks are marked complete. Typecheck, lint, and all 122 tests pass. The implementation broadly follows the contracts and architectural rules. There are a few issues ranging from a real bug to minor concerns.

**Verdict:** Mostly correct. One bug needs fixing. Several improvements recommended.

---

## 1. Issues Found

### 1.1 BUG: Double Secret Resolution in loadConfig (Medium Severity)

**File:** `src/config.ts`, lines 129-142

`loadConfig` resolves each secret **twice**:

1. Lines 130-140: Iterates all entries, calls `provider.resolve(entry.key)` for each, and stores results in `resolvedSecrets`.
2. Line 142: Calls `resolveSecrets(raw, providers, entries)` which walks the config tree and calls `provider.resolve()` again for every handlebar it encounters.

This means every secret is fetched from the provider twice. For the env provider this is harmless (reads `process.env` twice). For Azure Key Vault, this doubles the network calls and slows startup. It also means that if a Key Vault secret changes between the two calls, the `resolvedSecrets` map and the config could contain different values.

**Fix:** Either:
- (A) Remove the manual loop (lines 130-140) and instead build `resolvedSecrets` from the config tree walk, or
- (B) Resolve all secrets once into the `resolvedSecrets` map, then use a simpler string replacement to substitute handlebars in the config using that map (no provider calls needed).

Option B is preferred because it is more efficient and avoids any inconsistency risk.

### 1.2 CONCERN: String.replace Only Replaces First Occurrence (Low Severity)

**File:** `src/secrets/resolver.ts`, line 82

```typescript
resolved = resolved.replace(fullMatch, secretValue);
```

`String.prototype.replace` with a string argument only replaces the **first** occurrence. If the same handlebar appears multiple times in a single string (e.g., `"${{secretRef.token}}:${{secretRef.token}}"`), the `matchAll` loop will find both matches, but the second `replace` call will try to replace a handlebar that was already replaced by the first call, which will silently fail (no match found, no replacement). In practice, `matchAll` returns separate match objects for each occurrence, and the first `replace` replaces the first occurrence, and the second `replace` replaces what is now the first remaining occurrence, so this **actually works correctly** for this specific pattern. However, it is fragile -- if the resolved secret value itself contains the handlebar pattern, the second replacement could match inside the already-resolved value.

**Risk:** Low in practice. Secret values are unlikely to contain `${{secretRef.*}}` patterns. But worth noting.

**Fix:** Use `replaceAll` or replace via regex with global flag for each match, or resolve all matches in a single pass using `replace` with a callback.

### 1.3 CONCERN: Proxy Whitelist Matches Path Only, Not Full URL (Low Severity)

**File:** `src/proxy/proxy.ts`, lines 97-108

The proxy strips the `/proxy/` prefix and passes the remainder to `isUrlAllowed()`. For a request like `/proxy/googleapis.com/calendar/v3/events`, the matched value is `googleapis.com/calendar/v3/events`. This matches the whitelist patterns in the contract (`googleapis.com/calendar/v3/**`).

However, when the URL includes a protocol prefix (e.g., `/proxy/http://127.0.0.1:12345/path`), the matched value is `http://127.0.0.1:12345/path`, which would NOT match a whitelist pattern like `127.0.0.1:12345/**`. The integration test handles this by using `http://targetHost/**` in the whitelist, which works. But this means the whitelist must include the protocol when the request includes a protocol. The contract examples omit the protocol (`googleapis.com/calendar/v3/**`), which means real requests to `https://googleapis.com/...` via the proxy would work (proxy defaults to `https://`), but the whitelist check happens before the protocol is prepended, so it is consistent.

**Verdict:** Behavior is correct but the interaction between protocol handling and whitelist matching could confuse users. Worth documenting.

### 1.4 OBSERVATION: Milestone-5 Has No Goal Files

The `.chief/milestone-5/_goal/` directory is empty. The contracts in `_contract/` are well-defined and served as the effective goals. This is not a violation but is a structural deviation from the framework design where goals and contracts serve distinct purposes.

---

## 2. Contract Compliance

### 2.1 SecretProvider Interface (PASS)

The interface in `src/secrets/provider.ts` matches the contract in `secret-provider.md` exactly:
- `name: string` (readonly)
- `resolve(key: string): Promise<string>`
- `resolveMany?(keys: string[]): Promise<Map<string, string>>` (optional)
- `dispose?(): Promise<void>` (optional)

### 2.2 EnvProvider (PASS)

- Reads `process.env` directly
- Throws with exact message format: `Environment variable "X" is not set.`
- No retry logic
- No custom `.env` parsing (Bun handles it)

### 2.3 AzureKeyVaultProvider (PASS)

- Uses `DefaultAzureCredential` and `SecretClient`
- Retry logic: 3 retries with 2s/4s/8s backoff delays
- Error message includes secret key and underlying error
- `dispose()` implemented (no-op since SecretClient needs no cleanup)

### 2.4 Resolver (PASS)

- `resolveSecrets()` walks recursively through objects and arrays
- Non-string values pass through unchanged
- Returns new object (does not mutate input -- tested)
- Unknown secret name throws with config path
- Unknown provider throws with clear error
- Multiple handlebars in one string resolved

### 2.5 createProviders Factory (PASS)

- Creates `EnvProvider` for `"env"`
- Creates `AzureKeyVaultProvider` for `"azure-keyvault"`
- Throws for unknown provider names

### 2.6 loadConfig Flow (PASS with caveat)

- Signature is `async function loadConfig(): Promise<LoadConfigResult>`
- Pre-resolution check: handlebars without secrets block throws
- Post-resolution check: `assertNoUnresolvedRefs` called
- Providers disposed in `finally` block
- Backward compatible: config without secrets block works

The return type is `LoadConfigResult` (containing both `config` and `resolvedSecrets`) rather than just `Promise<Config>`. This is a reasonable extension beyond the contract to support the proxy, which needs the resolved secrets map. The contract specified `Promise<Config>` but this is strictly additive and does not break compatibility.

### 2.7 Config Schema Updates (PASS)

- `secrets` block: optional, correct shape
- `security.blacklistEnv`: optional string array
- `proxy` block: optional, correct fields

### 2.8 Env Var Blacklist (PASS)

- `filterEnv()` function creates a Set from the blacklist
- Filters `process.env` excluding blacklisted keys
- Passes filtered env to execa
- Empty/missing blacklist passes all vars
- Well-tested

### 2.9 Proxy (PASS)

- Resolves handlebars in headers, query params, and body
- Whitelist enforcement with picomatch glob matching
- `bypassWhitelist` flag support with console warning
- Auth header stripping (Authorization, X-Api-Key, X-Api-Secret, X-Secret-*)
- Binds to `127.0.0.1` only
- Conditional startup (only if `proxy` config block exists)
- Configurable port with default 9090

**Deviation from contract:** The contract sketch used Hono. The implementation uses `Bun.serve` directly. This is acceptable -- the contract noted "(or Bun.serve directly if simpler)" in the task spec.

---

## 3. CLAUDE.md and Rules Compliance

### 3.1 Adapter Pattern (PASS)

- Concrete adapter classes (`TelegramAdapter`, `ClaudeCodeAdapter`) are only imported in `src/index.ts` and test files
- `createProxy` is imported in `src/index.ts` -- this is a new module, not an adapter, so the rule about not importing concrete adapters outside `index.ts` does not strictly apply

### 3.2 TypeScript Standards (PASS)

- ES module imports used throughout
- `import type` used for type-only imports
- Files use kebab-case
- Interfaces use PascalCase without `I` prefix
- `const` used by default
- async/await used, no raw Promises
- JSDoc on public interfaces and exported functions

### 3.3 Error Handling (PASS)

- All errors throw `Error` objects, never strings
- Error messages include context (config paths, secret names)

### 3.4 Testing Standards (PASS)

- Test files use `*.test.ts` naming
- Uses `bun:test`
- Unit tests colocated with source
- Integration tests in `src/__tests__/`

### 3.5 CLAUDE.md Directory Structure (PASS)

The directory structure in CLAUDE.md lists the secrets and proxy directories, matching the implementation.

---

## 4. Test Coverage Assessment

### Unit Tests

| Module | Test File | Coverage Assessment |
|---|---|---|
| `secrets/resolver.ts` | `secrets/resolver.test.ts` | Good. Covers full replacement, partial interpolation, multiple handlebars, nested objects, arrays, passthrough, unknown secret, unknown provider, config path in errors. |
| `secrets/env.ts` | `secrets/env.test.ts` | Good. Covers resolve success, missing var, empty string. |
| `secrets/azure-keyvault.ts` | `secrets/azure-keyvault.test.ts` | Good. Covers success, no-value, retry success, retry exhaustion, dispose. Uses mocked Azure SDK. |
| `agent/claude-code.ts` | `agent/claude-code.test.ts` | Good. Covers buildArgs and filterEnv thoroughly. |
| `proxy/proxy.ts` | `proxy/proxy.test.ts` | Good. Covers resolveHandlebars, resolveHeaders, stripAuthHeaders, isUrlAllowed, and live server tests. |
| `config.ts` | `config.test.ts` | Good. Covers loadConfig with/without secrets, validation, error cases. |

### Integration Tests

| Test File | Coverage Assessment |
|---|---|
| `__tests__/config-integration.test.ts` | Good. Full pipeline with env provider, backward compatibility, error cases, partial interpolation. |
| `__tests__/proxy-integration.test.ts` | Good. End-to-end with local echo server, header resolution, query param resolution, body resolution, whitelist enforcement, auth header stripping. |

### Missing Test Coverage

1. **No test for `resolveMany`** -- The optional batch resolution method is never tested or implemented. This is fine since no provider currently overrides it, but worth noting.
2. **No test for the `Bun.serve` port 0 behavior** across different Bun versions (minor).
3. **Azure Key Vault retry tests use real sleep delays** (2s/4s/8s), making the retry-exhaustion test take ~14 seconds. The test timeout is set to 30s which covers it, but this slows the test suite. Consider injecting a sleep function for testability.

---

## 5. Security Review

### 5.1 Env Var Blacklist (PASS)

The critical security mechanism works correctly:
- `filterEnv()` strips blacklisted vars before passing to execa
- The blacklist is configurable via `security.blacklistEnv`
- Default (empty) passes all vars -- this means users must explicitly configure the blacklist

**Note:** The `config.example.json` includes the recommended blacklist values (`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`), which is good.

### 5.2 Proxy Security (PASS)

- Binds to `127.0.0.1` only -- not network-accessible
- Whitelist enforcement blocks unauthorized URLs
- Auth headers stripped from responses
- `bypassWhitelist` logs a warning

### 5.3 Secret Leakage Vectors (PASS)

- Resolved secrets are held in memory only
- Config file contains only `${{secretRef.*}}` handlebars, not actual values
- Proxy does not scan response bodies (documented trade-off)

### 5.4 Potential Concern: resolvedSecrets Passed Around

The `resolvedSecrets` map is returned from `loadConfig` and passed to `createProxy`. This map contains all resolved secret values as plain strings in memory. If any future code logs or serializes this map, secrets would leak. The current code handles it safely, but this is a surface to watch.

---

## 6. Code Quality

### Strengths

- Clean separation of concerns: provider interface, resolver, individual providers, proxy
- Good error messages with context throughout
- Immutability: resolver returns new objects, does not mutate input
- Proper resource cleanup with `finally` block for provider disposal
- Well-structured tests with good mock patterns

### Minor Issues

1. **Duplicated regex** -- `HANDLEBAR_RE` is defined in both `resolver.ts` and `proxy/proxy.ts`. Could be extracted to a shared constant, but the duplication is minor and both files are in distinct contexts.

2. **`hasSecretRefs` uses a new regex each call** -- The comment says "Use a fresh regex to avoid lastIndex issues with the global flag" which is correct. The implementation is fine.

3. **`Bun.serve` port 0** -- The proxy tests use `port: 0` to get a random port. The `ProxyServer` interface returns `server.port ?? port` which handles this correctly for Bun's `Server` API.

---

## 7. Deliverables Checklist

| Deliverable | Status | Notes |
|---|---|---|
| `src/secrets/provider.ts` | Present | Matches contract |
| `src/secrets/resolver.ts` | Present | Includes resolveSecrets, hasSecretRefs, assertNoUnresolvedRefs, createProviders |
| `src/secrets/env.ts` | Present | Clean implementation |
| `src/secrets/azure-keyvault.ts` | Present | With retry logic |
| `src/proxy/proxy.ts` | Present | Uses Bun.serve instead of Hono |
| `src/config.ts` | Updated | Async loadConfig, new Config fields |
| `src/index.ts` | Updated | Awaits loadConfig, passes blacklistEnv, conditional proxy |
| `src/agent/claude-code.ts` | Updated | filterEnv, blacklistEnv support |
| `config.example.json` | Updated | Full example with secrets, security, proxy |
| `.env.example` | Present | Documents expected env vars |
| `package.json` | Updated | --env-file .env in dev script, new dependencies |
| `src/secrets/resolver.test.ts` | Present | Comprehensive |
| `src/secrets/env.test.ts` | Present | Good coverage |
| `src/secrets/azure-keyvault.test.ts` | Present | With mocked SDK |
| `src/agent/claude-code.test.ts` | Present | Covers filterEnv |
| `src/proxy/proxy.test.ts` | Present | Unit + live server tests |
| `src/config.test.ts` | Updated | Async loadConfig tests |
| `src/__tests__/config-integration.test.ts` | Present | Full pipeline tests |
| `src/__tests__/proxy-integration.test.ts` | Present | End-to-end with echo server |

---

## 8. Verification Results

| Check | Result |
|---|---|
| `bun run typecheck` | PASS (exit 0, no errors) |
| `bun run lint` | PASS (29 files checked, no errors) |
| `bun test` | PASS (122 tests, 0 failures, 177 expects) |

---

## 9. Action Items

### Must Fix

1. **Double secret resolution in loadConfig** (Section 1.1) -- Each secret is fetched from the provider twice. Fix by resolving once and reusing the results. **FIXED in task-8:** Added `substituteSecrets()` to `src/secrets/resolver.ts` which substitutes handlebars from a pre-resolved map (synchronous, no provider calls). `loadConfig` now resolves each secret once via `provider.resolve()`, then uses `substituteSecrets()` to walk the config tree. All 132 tests pass (10 new tests for `substituteSecrets`).

### Recommended

2. **Extract sleep function in AzureKeyVaultProvider** for testability, so retry tests do not incur real 2s/4s/8s delays.
3. **Add goal files** to `.chief/milestone-5/_goal/` to maintain framework structure consistency.

### Optional

4. **Document protocol handling in proxy whitelist** -- Clarify whether whitelist patterns should include protocol prefix.
5. **Extract shared handlebar regex** to a common module to reduce duplication between `resolver.ts` and `proxy.ts`.
