# Task 2: Implement Paragraph-Aware Message Splitting Function

## Objective

Replace the existing `splitMessage` function with a new paragraph-aware version that splits on `\n\n` boundaries first, then falls back to `\n`, then hard-splits.

## Scope

- Modify `src/chat/telegram-markdown.ts` (add new splitting function)
- Implement and export `splitMessageByParagraph(text: string, maxLength?: number): string[]`
- Default max length: 4096
- Does NOT modify `telegram.ts` yet (integration is task-4)

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md`
- `.chief/milestone-9/_contract/rendering-pipeline.md` (Message Splitting Rules section)

## Steps

1. Implement primary split: split text on `\n\n`, accumulate paragraphs into chunks up to 4096 chars
2. Implement fallback: if a single paragraph exceeds 4096, split it on `\n` and accumulate lines
3. Implement hard-split: if a single line exceeds 4096, cut at 4096 chars
4. Export the function from `telegram-markdown.ts`

## Acceptance Criteria

- Short text (under 4096) returns a single chunk
- Text with multiple paragraphs splits at `\n\n` boundaries
- A single long paragraph splits at `\n` boundaries
- A single long line hard-splits at 4096
- No chunk exceeds 4096 characters
- Chunks do not start with unnecessary whitespace

## Verification

```bash
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- Updated `src/chat/telegram-markdown.ts` with exported `splitMessageByParagraph` function
