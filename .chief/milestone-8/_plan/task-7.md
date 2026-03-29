# Task 7: Update callback query handler and pin commands to use session id

## Objective

Update the `/s` command, `/session pin` subcommand, and callback query handler so that inline keyboard buttons and pin storage use session `id` (UUID) instead of session name.

## Scope

- `src/core/wrapper.ts` — the `/s`, `/session pin`, and callback query handler sections.

## Rules & Contracts

- `.chief/milestone-8/_contract/contract.md` — callback data format, command contracts.
- `.chief/_rules/_standard/typescript.md`

## Steps

1. Update `/session pin <name> <slot>` to resolve name via `findSessionByName`, then store `session.id` in pinnedSessions.
2. Update `/s` command to resolve pinned session ids to sessions, display `name` on buttons, use `pin:<id>` as callback data.
3. Update callback query handler to extract id from `pin:<id>`, look up session by id, resume by id.
4. Update stale-pin cleanup to check session existence by id.

## Acceptance Criteria

- Callback data uses `pin:<uuid>` format.
- Pin storage contains session ids, not names.
- Button labels still show human-readable names.
- Type checks pass.

## Verification

```bash
cd app && bun run typecheck
```

## Deliverables

- Updated `src/core/wrapper.ts` (pin/callback sections)
