# Task 5: Generic Secret Proxy Server

## Objective

Implement the generic HTTP proxy that resolves `${{secretRef.*}}` handlebars in incoming requests (headers, query params, body) and forwards them to external APIs. Strips auth headers from responses.

## Scope

**Included:**
- `src/proxy/proxy.ts` -- proxy server using Hono (or Bun.serve directly)
- Handlebar resolution in headers, URL query params, and request body
- URL whitelist enforcement with glob matching
- `bypassWhitelist` flag support
- Auth header stripping from responses
- Configurable port
- Conditional startup (only if `proxy` config block exists)
- Unit tests

**Excluded:**
- Secret resolution infrastructure (task-1, task-2)
- Config schema (task-3)

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md`
- `.chief/_rules/_verification/verification.md`
- `.chief/milestone-5/_contract/config-secret-ref.md` (proxy config schema)
- `.chief/milestone-5/_report/secret-access-discussion.md` (proxy design, safety rules)

## Steps

1. Install `hono` as a dependency (or use Bun.serve directly if simpler).
2. Create `src/proxy/proxy.ts`:
   - `createProxy(config, resolvedSecrets)` function.
   - Route: `ALL /proxy/*` -- extract target URL, resolve handlebars, forward.
   - Resolve `${{secretRef.*}}` in headers, query string, and body.
   - Whitelist check with glob matching (use picomatch or similar).
   - Strip `Authorization`, `X-Api-Key`, `X-Api-Secret`, `X-Secret-*` from responses.
3. In `src/index.ts`, conditionally start proxy if `config.proxy` exists:
   - Pass resolved secrets (from secret resolution step).
   - Bind to `127.0.0.1` only.
   - Log proxy port at startup.
   - If `bypassWhitelist: true`, log warning.
4. Write unit tests for:
   - Handlebar resolution in headers, query params, body.
   - Whitelist enforcement (allowed/blocked URLs).
   - Auth header stripping from responses.
   - Unknown secretRef throws error.

## Acceptance Criteria

- Proxy resolves `${{secretRef.*}}` in headers, query params, and body.
- Whitelist blocks non-matching URLs with 403.
- `bypassWhitelist: true` allows all URLs.
- Auth headers stripped from responses.
- Proxy binds to `127.0.0.1` only.
- Proxy does not start if no `proxy` config block.
- Configurable port from `proxy.port`.

## Verification

```bash
cd app && bun test src/proxy/
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- `src/proxy/proxy.ts`
- `src/proxy/proxy.test.ts`
- Updated `src/index.ts` (conditional proxy startup)
- Updated `package.json` (hono + picomatch dependencies if used)
