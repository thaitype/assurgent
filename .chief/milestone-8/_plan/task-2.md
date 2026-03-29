# Task 2: Extend ChatAdapter Interface and TelegramAdapter

## Objective

Add inline keyboard and callback query support to the adapter layer.

## Scope

- Add `sendInlineKeyboard` and `onCallbackQuery` to `ChatAdapter` interface
- Implement both in `TelegramAdapter` using grammY's `InlineKeyboard`
- Wire callback query listener in `start()`

## Rules & Contracts

- `/Users/thada/gits/thaitype/assurgent/.chief/_rules/_standard/typescript.md`
- `/Users/thada/gits/thaitype/assurgent/.chief/_rules/_verification/verification.md`
- `/Users/thada/gits/thaitype/assurgent/.chief/milestone-8/_contract/contract.md`

## Steps

1. Add to `ChatAdapter` interface in `src/interfaces/chat-adapter.ts`:
   - `sendInlineKeyboard(chatId, text, buttons)`: sends a message with inline keyboard buttons in a single row.
   - `onCallbackQuery(handler)`: registers a callback query handler.
2. In `TelegramAdapter`:
   - Store callback query handler similar to `messageHandler`.
   - Implement `sendInlineKeyboard` using grammY's `InlineKeyboard` class. Each button gets `label` as text and `callbackData` as callback data.
   - In `start()`, register `bot.callbackQuery` that calls the stored handler with `chatId` and `data`, then answers the callback query.
   - Check `isAllowed` for callback queries.

## Acceptance Criteria

- `ChatAdapter` interface has both new methods.
- `TelegramAdapter` implements both methods.
- Callback queries from disallowed users are ignored.
- `bot.callbackQuery` is answered (to remove Telegram's loading indicator).
- Type check passes.

## Verification

```bash
cd app && bun run typecheck
cd app && bun run lint
```

## Deliverables

- Modified `src/interfaces/chat-adapter.ts`
- Modified `src/chat/telegram.ts`
