# Task 1: Implement Table-to-Bullet Conversion Function

## Objective

Create a `convertTables` function that finds markdown tables in a string and replaces them with bullet-list representations suitable for Telegram.

## Scope

- Create new file: `src/chat/telegram-markdown.ts`
- Implement and export `convertTables(text: string): string`
- Does NOT touch `telegram.ts` or any other file

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md`
- `.chief/milestone-9/_contract/rendering-pipeline.md` (Table Conversion Rules section)

## Steps

1. Create `src/chat/telegram-markdown.ts`
2. Implement regex or line-by-line parser to detect markdown tables (header row, separator row, data rows)
3. For 2-column tables: convert to `* **key**: value` format
4. For 3+ column tables: convert to nested bullet format with bold first column
5. Handle edge cases: empty cells, single-column tables, tables with no data rows
6. Return the full text with tables replaced, non-table content untouched

## Acceptance Criteria

- `convertTables` correctly converts 2-column tables to flat bullets
- `convertTables` correctly converts 3+ column tables to nested bullets
- Non-table markdown content passes through unchanged
- Empty cells are omitted from output
- Function is exported as a named export

## Verification

```bash
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- `src/chat/telegram-markdown.ts` with exported `convertTables` function
