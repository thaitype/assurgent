# Task 10: Rewrite proxy routing to use x-assurgent-upstream header

## Objective

Replace `/proxy/` path-based routing in `src/proxy/proxy.ts` with `x-assurgent-upstream` header-based routing. Replace glob-based whitelist with domain-only matching.

## Scope

### Included

- Rewrite `createProxy` fetch handler to use `x-assurgent-upstream` header
- Replace `isUrlAllowed` with domain-only hostname matching (remove picomatch dependency)
- Implement URL construction: trim trailing `/` from header, trim leading `/` from path, join with `/`
- Handle missing header: 400 with JSON error + hint
- Handle duplicate headers: 400 with JSON error
- Default to `https://` if no scheme in header
- Strip `x-assurgent-upstream` from forwarded headers (in `resolveHeaders`)
- Log WARNING on every request when `bypassWhitelist` is true (not just at startup)
- Do NOT resolve handlebars in the `x-assurgent-upstream` header value
- Update `ProxyConfig` interface: `whitelist` is now `string[]` of domains (no globs)

### Excluded

- Test updates (task-11)
- Config file updates (task-12)
- Secret resolution logic changes

## Rules & Contracts

- `/Users/thada/gits/thaitype/assurgent/CLAUDE.md`
- `/Users/thada/gits/thaitype/assurgent/.chief/_rules/_standard/typescript.md`
- `/Users/thada/gits/thaitype/assurgent/.chief/_rules/_verification/verification.md`
- `/Users/thada/gits/thaitype/assurgent/.chief/milestone-5/_contract/config-secret-ref.md` (Proxy Config section)
- `/Users/thada/gits/thaitype/assurgent/.chief/milestone-5/_goal/proxy-redesign.md`

## Steps

1. In `src/proxy/proxy.ts`:
   - Remove `stripProtocol` helper and picomatch import.
   - Rewrite `isUrlAllowed(url, whitelist)` to extract hostname from URL and check if it matches any domain in the whitelist (exact match).
   - In `createProxy` fetch handler:
     - Read `x-assurgent-upstream` header. If missing, return 400 with error + hint JSON.
     - If multiple values (check via `req.headers.get` returning comma-separated or `getAll`), return 400.
     - If header has no scheme, prepend `https://`.
     - Trim trailing `/` from header value, trim leading `/` from `url.pathname`, join with `/`.
     - Check whitelist against hostname from the constructed upstream URL.
     - If `bypassWhitelist`, log `console.warn(...)` on every request.
     - Resolve handlebars in query, headers (skip `x-assurgent-upstream`), and body as before.
     - Forward request to constructed target URL.
   - In `resolveHeaders`: skip `x-assurgent-upstream` header (same as `host`).
2. Remove picomatch from `package.json` if no other file uses it.

## Acceptance Criteria

1. Requests with valid `x-assurgent-upstream` header route to the correct upstream URL.
2. Missing header returns 400 with `{"error": "Missing x-assurgent-upstream header", "hint": "..."}`.
3. Duplicate header returns 400 with clear error.
4. Header without scheme defaults to `https://`.
5. Trailing path in header is handled correctly (trimming and joining).
6. `x-assurgent-upstream` is not forwarded to upstream.
7. `bypassWhitelist` logs WARNING per request.
8. Whitelist does domain-only matching (no globs).
9. `bun run typecheck` passes.

## Verification

```bash
cd /Users/thada/gits/thaitype/assurgent && bun run typecheck
```

Note: tests will be updated in task-11, so `bun test` may fail after this task until task-11 is done.

## Deliverables

- Modified `src/proxy/proxy.ts`
- Possibly modified `package.json` (picomatch removal)
