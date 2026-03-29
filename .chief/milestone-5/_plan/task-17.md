# Task 17: Extend isUrlAllowed to support host:port whitelist entries

## Objective

Update the `isUrlAllowed` function in `src/proxy/proxy.ts` to support whitelist entries that include a port (e.g. `"127.0.0.1:3000"`), in addition to the existing hostname-only entries.

## Scope

- **Included:** `src/proxy/proxy.ts` (isUrlAllowed function, ProxyConfig JSDoc), `src/proxy/proxy.test.ts` (new tests)
- **Excluded:** No changes to proxy server logic, config loading, or secret resolution

## Rules & Contracts

- `.chief/_rules/_standard/typescript.md`
- `.chief/_rules/_verification/verification.md`
- `.chief/milestone-5/_contract/config-secret-ref.md` (updated whitelist spec)
- `.chief/milestone-5/_goal/proxy-redesign.md` (key decision #2)

## Steps

1. Update `isUrlAllowed` in `src/proxy/proxy.ts`:
   - For each whitelist entry, check if it contains `:`.
   - If yes: match against `parsed.hostname:parsed.port` (use the URL's explicit port).
   - If no: match against `parsed.hostname` only (existing behavior).
   - Note: `new URL("https://example.com").port` returns `""` for default ports. An entry like `"example.com:443"` should match `https://example.com` -- so when the URL port is empty, derive the default port from the scheme (443 for https, 80 for http).
2. Update the JSDoc on `ProxyConfig.whitelist` to mention host:port support.
3. Add unit tests in `src/proxy/proxy.test.ts` for:
   - `"127.0.0.1:3000"` matches `http://127.0.0.1:3000/path`
   - `"192.168.1.100:8080"` matches `http://192.168.1.100:8080/api`
   - `"127.0.0.1:3000"` does NOT match `http://127.0.0.1:4000/path` (wrong port)
   - `"127.0.0.1:3000"` does NOT match `http://127.0.0.1/path` (no port, defaults to 80)
   - Mixed whitelist: `["googleapis.com", "127.0.0.1:3000"]` -- both types work
   - `"example.com:443"` matches `https://example.com/path` (default port)

## Acceptance Criteria

- `isUrlAllowed("http://127.0.0.1:3000/path", ["127.0.0.1:3000"])` returns `true`
- `isUrlAllowed("http://127.0.0.1:4000/path", ["127.0.0.1:3000"])` returns `false`
- `isUrlAllowed("https://googleapis.com/path", ["googleapis.com"])` still returns `true` (no regression)
- All new and existing tests pass

## Verification

```bash
cd /Users/thada/gits/thaitype/assurgent && bun run typecheck
cd /Users/thada/gits/thaitype/assurgent && bun test
cd /Users/thada/gits/thaitype/assurgent && bun run lint
```

## Deliverables

- Updated `src/proxy/proxy.ts`
- Updated `src/proxy/proxy.test.ts`
