# Task 12: Update config.example.json and Config type for new proxy whitelist

## Objective

Update `config.example.json` and the `Config` interface in `src/config.ts` to reflect the new domain-only whitelist format. Remove any reference to glob patterns.

## Scope

### Included

- Update `config.example.json`: change whitelist entries from glob patterns to plain domains
- Verify `Config` interface `proxy.whitelist` type is already `string[]` (no change needed if so)
- Add a JSDoc comment on `whitelist` clarifying it is domain-only

### Excluded

- No changes to proxy implementation or tests

## Rules & Contracts

- `/Users/thada/gits/thaitype/assurgent/CLAUDE.md`
- `/Users/thada/gits/thaitype/assurgent/.chief/_rules/_standard/typescript.md`
- `/Users/thada/gits/thaitype/assurgent/.chief/milestone-5/_contract/config-secret-ref.md`

## Steps

1. Update `config.example.json`:
   - Change `"whitelist": ["googleapis.com/calendar/v3/**", "graph.microsoft.com/v1.0/me/calendar/**"]`
   - To `"whitelist": ["googleapis.com", "graph.microsoft.com"]`
2. In `src/config.ts`, add JSDoc comment on the `whitelist` field in the `proxy` section of `Config` interface to clarify domain-only matching.

## Acceptance Criteria

1. `config.example.json` has domain-only whitelist entries.
2. `Config` type has a clarifying comment on `whitelist`.
3. `bun run typecheck` passes.
4. `bun run lint` passes.

## Verification

```bash
cd /Users/thada/gits/thaitype/assurgent && bun run typecheck
cd /Users/thada/gits/thaitype/assurgent && bun run lint
```

## Deliverables

- Modified `config.example.json`
- Modified `src/config.ts` (JSDoc only)
