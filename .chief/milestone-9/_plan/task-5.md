# Task 5: Write Unit Tests for Table Conversion, Message Splitting, and Pipeline

## Objective

Create comprehensive unit tests for all functions in `telegram-markdown.ts`.

## Scope

- Create new file: `src/chat/telegram-markdown.test.ts`
- Test `convertTables`, `splitMessageByParagraph`, and `processMarkdown`
- Does NOT test actual Telegram API calls (that is integration testing)

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md` (Testing section)
- `.chief/_rules/_verification/verification.md`
- `.chief/milestone-9/_contract/rendering-pipeline.md`

## Steps

1. Create `src/chat/telegram-markdown.test.ts`
2. Write tests for `convertTables`:
   - 2-column table converts to flat bullets
   - 3+ column table converts to nested bullets
   - Non-table content passes through unchanged
   - Mixed content (text + table + text) preserves surrounding text
   - Empty cells are omitted
   - Table with no data rows is omitted
3. Write tests for `splitMessageByParagraph`:
   - Short text returns single chunk
   - Multi-paragraph text splits at `\n\n`
   - Long single paragraph splits at `\n`
   - Long single line hard-splits at max length
   - No chunk exceeds max length
4. Write tests for `processMarkdown`:
   - End-to-end: table + long text is converted and split correctly
   - Output is an array of strings

## Acceptance Criteria

- All tests pass with `bun test`
- Tests cover the cases listed above
- Test file is colocated with source (`src/chat/telegram-markdown.test.ts`)

## Verification

```bash
cd app && bun test
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- `src/chat/telegram-markdown.test.ts`
