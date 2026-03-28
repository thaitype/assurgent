# Verification Rules

## Required Checks

All tasks must pass these checks before being marked complete.

### 1. Type Check

```bash
cd app && bun run typecheck
```

Must exit 0 with no type errors.

### 2. Tests

```bash
cd app && bun test
```

Must exit 0. All tests must pass.

### 3. Lint

```bash
cd app && bun run lint
```

Must exit 0 with no errors. Warnings are acceptable but should be minimized.

## Definition of Done

A task is complete when:

1. All checks above pass
2. New code has corresponding unit tests (where applicable)
3. No unrelated files are modified
4. Changes match the task spec's acceptance criteria

## When Checks Are Not Yet Available

During initial project setup (before package.json and tsconfig.json exist), verification is relaxed:

- Type check and lint may be skipped until tooling is configured
- Once tooling is in place, all subsequent tasks must pass all checks
