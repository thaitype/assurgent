# Task 8: Fix Double Secret Resolution in loadConfig

## Objective

Eliminate the double-resolution bug in `src/config.ts` where every secret is fetched from its provider twice during `loadConfig`.

## Scope

**Included:**
- `src/config.ts` -- fix `loadConfig` to resolve secrets only once
- `src/secrets/resolver.ts` -- add a new function that substitutes handlebars from a pre-resolved map (no provider calls)
- `src/secrets/resolver.test.ts` -- add tests for the new function
- `src/config.test.ts` -- existing tests must still pass

**Excluded:**
- No changes to provider implementations
- No changes to proxy, agent, or chat code
- No changes to interfaces

## Rules & Contracts to Follow

- `/Users/thada/gits/thaitype/assurgent/CLAUDE.md`
- `/Users/thada/gits/thaitype/assurgent/.chief/_rules/_standard/typescript.md`
- `/Users/thada/gits/thaitype/assurgent/.chief/_rules/_verification/verification.md`

## Steps

1. In `src/secrets/resolver.ts`, add a new exported function `substituteSecrets(config: unknown, resolvedSecrets: Record<string, string>, currentPath?: string): unknown` that walks the config tree (same recursive structure as `resolveSecrets`) but replaces `${{secretRef.<name>}}` handlebars using the pre-resolved map instead of calling providers. It should throw if a handlebar references a name not in the map. It must return a new object (no mutation). It is synchronous (no async needed since no provider calls).

2. In `src/config.ts`, change `loadConfig` so that:
   - The manual loop (lines 130-140) stays -- it resolves each secret once and builds `resolvedSecrets`.
   - Replace the call to `resolveSecrets(raw, providers, entries)` on line 142 with a call to the new `substituteSecrets(raw, resolvedSecrets)`.
   - This eliminates all duplicate provider calls.

3. Add unit tests for `substituteSecrets` in `src/secrets/resolver.test.ts` covering: simple replacement, partial interpolation, nested objects, arrays, unknown secret name throws, no handlebars passthrough.

4. Run all verification checks.

## Acceptance Criteria

- `loadConfig` calls each provider's `resolve()` exactly once per secret entry.
- The `resolvedSecrets` map and the resolved config values are always consistent (derived from the same single resolution).
- All existing tests pass without modification.
- New unit tests cover `substituteSecrets`.
- `bun run typecheck`, `bun run lint`, and `bun test` all pass.

## Verification

```bash
cd app && bun run typecheck
cd app && bun run lint
cd app && bun test
```

## Deliverables

- Modified `src/config.ts`
- Modified `src/secrets/resolver.ts` (new `substituteSecrets` function)
- Modified `src/secrets/resolver.test.ts` (new tests)
