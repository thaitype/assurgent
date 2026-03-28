# Task 7: Integration Tests for Secret Resolution and Proxy

## Objective

Write integration-level tests that verify the full pipeline: config loading with multi-provider secret resolution, env var blacklist filtering, and proxy request handling end-to-end.

## Scope

**Included:**
- Integration test: loadConfig with mock providers resolves all handlebars correctly
- Integration test: proxy resolves handlebars and forwards request (use local test server)
- Integration test: env var blacklist filtering in child process env construction
- Edge cases: missing secrets block with handlebars, unknown provider, retry exhaustion

**Excluded:**
- Real Azure Key Vault calls (requires credentials, tester-agent scope)
- Real external API calls through proxy

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md`
- `.chief/_rules/_verification/verification.md`

## Steps

1. Create `src/__tests__/config-integration.test.ts`:
   - Test full loadConfig pipeline with mock providers.
   - Test backward compatibility (config without secrets block).
   - Test error cases (handlebars without secrets block, unresolved handlebars).
2. Create `src/__tests__/proxy-integration.test.ts`:
   - Spin up a local test HTTP server.
   - Start proxy with mock resolved secrets.
   - Verify header/query/body handlebar resolution.
   - Verify whitelist enforcement.
   - Verify auth header stripping from responses.
3. Verify all unit + integration tests pass together.

## Acceptance Criteria

- Full config loading pipeline tested with multi-provider mocks.
- Proxy end-to-end tested with local HTTP server.
- All error paths tested.
- All tests pass in CI-compatible environment (no real cloud calls).

## Verification

```bash
cd app && bun test
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- `src/__tests__/config-integration.test.ts`
- `src/__tests__/proxy-integration.test.ts`
