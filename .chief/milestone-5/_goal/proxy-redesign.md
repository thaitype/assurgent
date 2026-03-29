# Goal: Proxy Routing Redesign

## Summary

Replace `/proxy/` path-based routing with `x-assurgent-upstream` header-based routing. Simplify whitelist from glob patterns to domain-only matching.

## Motivation

The path-encoded URL approach (`/proxy/googleapis.com/path`) is fragile and awkward for agents to use. A header-based approach lets the agent set its base URL to `http://127.0.0.1:<port>` and specify the upstream via a standard header, which is cleaner and more predictable.

## Key Decisions

1. **Routing**: `x-assurgent-upstream` header replaces `/proxy/` prefix.
2. **Whitelist**: Domain-only matching (no globs). Example: `["googleapis.com"]`.
3. **`bypassWhitelist`**: Kept, but logs WARNING on every proxied request when enabled.
4. **Trailing path in header**: Allowed. Trim trailing `/` from header, trim leading `/` from path, join with `/`.
5. **Missing header**: 400 with JSON error including a `hint` field.
6. **Handlebars in upstream header**: NOT supported. Header is a plain URL.
7. **Query strings in upstream header**: NOT supported.
8. **Duplicate headers**: Reject with 400.
9. **Scheme**: Default to `https://` if header value has no scheme.
10. **`/proxy/` prefix**: Removed entirely.
11. **`x-assurgent-upstream` header**: Stripped before forwarding to upstream.

## Out of Scope

- No changes to secret resolution logic.
- No changes to the `SecretProvider` interface.
- No changes to `loadConfig` flow.
