# Task 11: Update all proxy tests for header-based routing

## Objective

Update unit tests in `src/proxy/proxy.test.ts` and integration tests in `src/__tests__/proxy-integration.test.ts` to use the new `x-assurgent-upstream` header routing.

## Scope

### Included

- Rewrite `isUrlAllowed` tests for domain-only matching
- Replace `/proxy/` prefix tests with `x-assurgent-upstream` header tests
- Add test: missing header returns 400 with error + hint
- Add test: duplicate header returns 400
- Add test: header without scheme defaults to https
- Add test: trailing path in header is trimmed correctly
- Add test: `x-assurgent-upstream` is not forwarded to upstream
- Add test: `bypassWhitelist` logs warning per request
- Update all integration tests to use header-based routing
- Update whitelist integration tests for domain-only matching

### Excluded

- No changes to proxy implementation (done in task-10)
- No changes to config files

## Rules & Contracts

- `/Users/thada/gits/thaitype/assurgent/CLAUDE.md`
- `/Users/thada/gits/thaitype/assurgent/.chief/_rules/_standard/typescript.md`
- `/Users/thada/gits/thaitype/assurgent/.chief/_rules/_verification/verification.md`
- `/Users/thada/gits/thaitype/assurgent/.chief/milestone-5/_goal/proxy-redesign.md`

## Steps

1. Rewrite `src/proxy/proxy.test.ts`:
   - Update `isUrlAllowed` tests: test domain matching, not glob matching.
   - Update `createProxy (live server)` tests: use `x-assurgent-upstream` header instead of `/proxy/` paths.
   - Add new tests for missing header, duplicate header, no-scheme default, trailing path trimming, header stripping.
2. Rewrite `src/__tests__/proxy-integration.test.ts`:
   - Change all requests to send `x-assurgent-upstream` header pointing to the local echo server.
   - Update whitelist tests to use domain list.
   - Verify `x-assurgent-upstream` is not forwarded to the echo server.

## Acceptance Criteria

1. All existing test scenarios are covered with the new routing mechanism.
2. New edge cases (missing header, duplicate header, no scheme, trailing path) are tested.
3. `bun test` passes with 0 failures.
4. `bun run lint` passes.

## Verification

```bash
cd /Users/thada/gits/thaitype/assurgent && bun test
cd /Users/thada/gits/thaitype/assurgent && bun run lint
```

## Deliverables

- Modified `src/proxy/proxy.test.ts`
- Modified `src/__tests__/proxy-integration.test.ts`
