# Task 3: Implement MarkdownV2 Processing Pipeline with Three-Tier Fallback

## Objective

Create the full rendering pipeline function that chains table conversion, splitting, and MarkdownV2 escaping. Also create a send helper with three-tier fallback (MarkdownV2 -> Markdown -> plain text).

## Scope

- Add `telegramify-markdown` npm dependency
- Add to `src/chat/telegram-markdown.ts`:
  - `processMarkdown(text: string): string[]` -- runs full pipeline, returns escaped chunks
  - `sendWithFallback(sendFn, chunk)` -- helper that tries MarkdownV2, then Markdown, then plain
- Does NOT modify `telegram.ts` yet (integration is task-4)

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md`
- `.chief/milestone-9/_contract/rendering-pipeline.md` (Pipeline Stages, Fallback Behavior, telegramify-markdown Usage)

## Steps

1. Install `telegramify-markdown`: `cd app && bun add telegramify-markdown`
2. Implement `processMarkdown(text: string): string[]`:
   - Call `convertTables(text)` (from task-1)
   - Call `splitMessageByParagraph(result, 4096)` (from task-2)
   - Apply `telegramify-markdown` escaping to each chunk
   - Return array of escaped chunks
3. Implement `sendWithFallback` that accepts a generic send function and a raw (unescaped) chunk plus its escaped version:
   - Try sending escaped chunk with `parse_mode: "MarkdownV2"`
   - On failure, try raw chunk with `parse_mode: "Markdown"`
   - On failure, send raw chunk with no parse_mode
4. Export both functions

## Acceptance Criteria

- `processMarkdown` chains all three stages correctly
- `sendWithFallback` correctly falls through all three tiers
- `telegramify-markdown` is listed in `package.json` dependencies
- Pipeline preserves non-table markdown (headings, bold, code blocks, etc.)

## Verification

```bash
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- Updated `app/package.json` with `telegramify-markdown` dependency
- Updated `src/chat/telegram-markdown.ts` with `processMarkdown` and `sendWithFallback`
