# Task 16: Update README.md secrets documentation for multi-provider format

## Objective

Update the README.md to document the new multi-provider config format with user-chosen instance names.

## Scope

- **Included:** `README.md` (secrets/config documentation sections only)
- **Excluded:** All source files

## Rules & Contracts to Follow

- `.chief/milestone-5/_goal/multi-provider.md`
- `.chief/milestone-5/_contract/config-secret-ref.md`

## Steps

1. Find the secrets configuration section in README.md.
2. Update the example config JSON to use the new format:
   - Provider instances with user-chosen names and `type` field.
   - Updated entries referencing instance names.
3. Update any prose describing how providers work (mention `type` discriminator, multiple instances).
4. Keep existing non-secrets documentation unchanged.

## Acceptance Criteria

- README.md shows the new config format with `type` field in provider entries.
- No references to the old format where provider name = type.

## Verification

- Visual review of README.md (no automated check needed).

## Deliverables

- Updated `README.md`
