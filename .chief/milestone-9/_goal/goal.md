# Milestone 9: Improve Markdown Response Rendering in Telegram

## Objective

Improve how Claude's markdown responses render in Telegram by building a processing pipeline inside `TelegramAdapter`. The pipeline converts raw markdown into Telegram-friendly formats with proper escaping, table conversion, message splitting, and graceful fallback.

## Design Decisions

### 1. Three-Tier Fallback

Send each chunk with MarkdownV2 parse mode first. If that fails, retry with legacy Markdown. If that also fails, send as plain text (no parse mode).

### 2. Table Conversion

Telegram does not render markdown tables. Convert them to bullet lists before sending:

- **2-column tables** (key-value): flat bullets with bold key -- `* **key**: value`
- **3+ column tables**: nested bullets with bold label -- `* **Label**` then nested `  * Header: value`

### 3. Message Splitting

Split at paragraph boundaries (`\n\n`), max 4096 chars per chunk. If a single paragraph exceeds 4096 chars, fall back to splitting on `\n`.

### 4. MarkdownV2 Escaping

Use the `telegramify-markdown` npm package for MarkdownV2 escaping. Custom logic handles table conversion, message splitting, and fallback tiers.

### 5. Scope Boundary

All processing is internal to `TelegramAdapter`. The `ChatAdapter` interface does NOT change. No other adapters or modules are affected.

### 6. Pipeline Order

```
raw markdown
  -> table conversion (markdown tables -> bullet lists)
  -> split on paragraph boundaries (max 4096 chars)
  -> escape each chunk via telegramify-markdown
  -> send with MarkdownV2 parse mode
  -> fallback to legacy Markdown on failure
  -> fallback to plain text on failure
```
