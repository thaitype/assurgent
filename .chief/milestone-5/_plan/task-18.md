# Task 18: Update config.example.json and README for host:port whitelist

## Objective

Update documentation and example config to show the new host:port whitelist capability.

## Scope

- **Included:** `config.example.json`, `README.md` (proxy section only)
- **Excluded:** No code changes. No changes outside proxy documentation.

## Rules & Contracts

- `.chief/_rules/_standard/typescript.md`
- `.chief/milestone-5/_contract/config-secret-ref.md`

## Steps

1. Update `config.example.json`: add `"127.0.0.1:3000"` to the proxy whitelist array as an example.
2. Update `README.md` proxy section:
   - Mention that whitelist supports both domain names and `host:port` entries.
   - Add a brief example showing `"127.0.0.1:3000"` in the whitelist.
   - Update the config reference table for `proxy.whitelist` description.

## Acceptance Criteria

- `config.example.json` whitelist contains at least one host:port example
- README documents the two whitelist entry formats
- No code changes in this task

## Verification

```bash
# No code changes, but ensure lint passes on json
cd /Users/thada/gits/thaitype/assurgent && bun run lint
```

## Deliverables

- Updated `config.example.json`
- Updated `README.md`
