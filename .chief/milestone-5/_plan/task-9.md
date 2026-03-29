# Task 9: Fix release readiness issues

## Objective

Fix all issues identified in the release readiness report before v0.3.0 release.

## Scope

Four fixes:

1. **BLOCKER**: Add `.env` to `.gitignore`
2. **WARNING**: Normalize proxy whitelist URL matching to strip protocol prefixes
3. **WARNING**: Lazy-load Azure SDK in `azure-keyvault.ts` using dynamic `import()`
4. **NOTE**: Extract duplicated handlebar regex to shared constant

## Rules & Contracts

- `.chief/_rules/_standard/typescript.md`
- `.chief/_rules/_verification/verification.md`

## Steps

### Fix 1: .gitignore
- Add `.env` entry to root `.gitignore`

### Fix 2: Proxy whitelist normalization
- In `isUrlAllowed()`, strip `http://` and `https://` protocol prefix from the URL before matching
- Add test cases for URLs with protocol prefixes

### Fix 3: Lazy Azure imports
- Convert static imports in `azure-keyvault.ts` to dynamic `import()` inside the constructor
- Update `resolver.ts` to use dynamic `import()` for `AzureKeyVaultProvider`
- Update `createProviders()` to be async since it now needs `await import()`

### Fix 4: Shared handlebar regex
- Create `src/secrets/constants.ts` with the shared `HANDLEBAR_RE` regex
- Update `resolver.ts` and `proxy.ts` to import from the shared constant

## Acceptance Criteria

- `.env` is listed in `.gitignore`
- `isUrlAllowed("http://googleapis.com/calendar/v3/events", ["googleapis.com/calendar/v3/**"])` returns `true`
- `@azure/identity` and `@azure/keyvault-secrets` are only imported when Azure provider is used
- `HANDLEBAR_RE` is defined in exactly one place
- All existing tests pass
- `bun run typecheck` passes
- `bun run lint` passes

## Verification

```bash
bun run typecheck
bun test
bun run lint
```

## Deliverables

- Updated `.gitignore`
- Updated `src/proxy/proxy.ts`
- Updated `src/proxy/proxy.test.ts`
- Updated `src/secrets/azure-keyvault.ts`
- Updated `src/secrets/resolver.ts`
- New `src/secrets/constants.ts`
- Updated `.chief/milestone-5/_report/release-readiness.md`
