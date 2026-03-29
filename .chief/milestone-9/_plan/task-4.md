# Task 4: Integrate Pipeline into TelegramAdapter sendText and editMessage

## Objective

Wire the rendering pipeline into `TelegramAdapter.sendText` and `TelegramAdapter.editMessage`, replacing the current simple Markdown send logic.

## Scope

- Modify `src/chat/telegram.ts`
- Replace current `sendText` implementation with pipeline calls
- Replace current `editMessage` implementation with pipeline calls
- Remove the old `splitMessage` export from `telegram.ts` (it is superseded by `splitMessageByParagraph`)

## Rules & Contracts to Follow

- `.chief/_rules/_standard/typescript.md`
- `.chief/milestone-9/_contract/rendering-pipeline.md` (full pipeline, interface boundary)
- `ChatAdapter` interface must NOT change

## Steps

1. Import `processMarkdown` and `sendWithFallback` from `./telegram-markdown`
2. Update `sendText`:
   - Call `processMarkdown(text)` to get escaped chunks and keep raw chunks
   - For each chunk, use `sendWithFallback` to send
3. Update `editMessage`:
   - Process text through pipeline
   - Edit first message with fallback
   - Send remaining chunks as new messages with fallback
4. Remove the old `splitMessage` function from `telegram.ts`
5. Ensure no other file imports the old `splitMessage` -- if anything does, update those imports

## Acceptance Criteria

- `sendText` uses the full pipeline (table conversion -> split -> escape -> fallback send)
- `editMessage` uses the full pipeline
- `ChatAdapter` interface is unchanged
- Old `splitMessage` is removed from `telegram.ts`
- No broken imports across the codebase

## Verification

```bash
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- Updated `src/chat/telegram.ts`
