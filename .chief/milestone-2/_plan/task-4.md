# Task 4: Implement Telegram Adapter with Tests

## Objective

Create the Telegram chat adapter using grammy that handles incoming messages, commands, message sending, placeholder editing, and message chunking.

## Scope

- Create `app/src/chat/telegram.ts`
- Create `app/src/chat/telegram.test.ts`

## Rules & Contracts to Follow

- `.chief/milestone-2/_contract/interfaces.md` -- ChatAdapter interface
- `.chief/_rules/_standard/typescript.md` -- coding standards

## Steps

1. Create `src/chat/telegram.ts` with:
   - `splitMessage(text: string, maxLength: number): string[]` -- exported pure function. Splits at last newline before maxLength, falls back to hard split
   - `TelegramAdapter` class implementing `ChatAdapter`
   - Constructor takes `{ botToken, allowedUserIds, placeholder? }` config
   - `isAllowed(userId)` -- checks against allowedUserIds
   - `start()` -- registers command handlers and message handler on the bot, then starts polling
   - `sendText()` -- sends chunked messages, tries Markdown parse mode first, falls back to plain text
   - `sendPlaceholder()` -- sends placeholder if enabled, returns message_id
   - `editMessage()` -- edits placeholder with first chunk, sends remaining as new messages
   - `sendTyping()` -- sends "typing" chat action
2. Create `src/chat/telegram.test.ts` testing:
   - `splitMessage` with text under limit (returns single chunk)
   - `splitMessage` with text over limit (splits at newline)
   - `splitMessage` with no newlines (hard split at maxLength)
   - `splitMessage` with multiple chunks needed
   - Do NOT test grammy Bot internals (those require network)

## Acceptance Criteria

- `TelegramAdapter` implements the full `ChatAdapter` interface
- `splitMessage` is a pure exported function with full test coverage
- Markdown fallback to plain text on parse failure
- User filtering via allowedUserIds
- All tests pass
- Type check and lint pass

## Verification

```bash
cd app && bun run typecheck && bun test && bun run lint
```

## Deliverables

- `app/src/chat/telegram.ts`
- `app/src/chat/telegram.test.ts`
