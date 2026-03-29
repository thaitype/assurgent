# Task 8: Update tests for re-keyed session system

## Objective

Update all existing tests to work with UUID-keyed sessions. Add targeted tests for the new `findSessionByName` method and id-based lookups.

## Scope

- Test files related to session-manager and wrapper.
- No production code changes.

## Rules & Contracts

- `.chief/milestone-8/_contract/contract.md`
- `.chief/_rules/_verification/verification.md`

## Steps

1. Update session-manager tests: sessions created must include `id` field; assertions check id-based storage.
2. Update wrapper tests: mock sessions include `id`; command handlers tested with name-to-id resolution.
3. Add test: `findSessionByName` returns correct session when name matches.
4. Add test: `findSessionByName` returns undefined when no match.
5. Add test: pin storage and callback data use UUIDs.
6. Add test: rename session keeps same id key.

## Acceptance Criteria

- All tests pass: `bun test`.
- Type checks pass: `bun run typecheck`.
- Lint passes: `bun run lint`.

## Verification

```bash
cd app && bun test
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- Updated test files
