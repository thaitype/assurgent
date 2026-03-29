# Rendering Pipeline Contract

## Pipeline Stages

```
input: string (raw markdown from agent)
  |
  v
[1] convertTables(input) -> string
  |
  v
[2] splitMessage(text, 4096) -> string[]
  |
  v
[3] for each chunk:
      escapeMarkdownV2(chunk) -> string   (via telegramify-markdown)
  |
  v
[4] send with parse_mode: "MarkdownV2"
      on error -> retry with parse_mode: "Markdown"
      on error -> retry with no parse_mode (plain text)
```

## Table Conversion Rules

### Detection

A markdown table is a block of lines where:
- At least one header row exists (cells separated by `|`)
- A separator row follows (`|---|---|...` pattern)
- One or more data rows follow

### 2-Column Tables (Key-Value)

Input:
```markdown
| Key | Value |
|-----|-------|
| Name | Alice |
| Role | Admin |
```

Output:
```
* **Name**: Alice
* **Role**: Admin
```

The first column becomes the bold key. The second column becomes the value.

### 3+ Column Tables

Input:
```markdown
| Name | Role | Status |
|------|------|--------|
| Alice | Admin | Active |
| Bob | User | Inactive |
```

Output:
```
* **Alice**
  * Role: Admin
  * Status: Active
* **Bob**
  * Role: User
  * Status: Inactive
```

The first column becomes the bold label. Remaining columns become nested items with their header as the label.

### Edge Cases

- Empty cells: omit the nested bullet for that cell
- Single-column tables: render as a plain bullet list
- Tables with no data rows: omit entirely

## Message Splitting Rules

### Primary: Paragraph Boundary Split

1. Split text on `\n\n` into paragraphs
2. Accumulate paragraphs into chunks, each at most 4096 chars
3. When adding the next paragraph would exceed 4096, start a new chunk

### Fallback: Line Boundary Split

If a single paragraph exceeds 4096 chars:
1. Split that paragraph on `\n`
2. Accumulate lines into chunks, each at most 4096 chars
3. If a single line exceeds 4096, hard-split at 4096 chars

### Max Chunk Size

Telegram message limit is 4096 characters. Use 4096 as the max (the current code uses 4000 which is conservative but slightly wasteful).

## Fallback Behavior

Each chunk is sent independently with its own fallback chain:

```
try:
  send(chunk, parse_mode: "MarkdownV2")
catch:
  try:
    send(chunk, parse_mode: "Markdown")
  catch:
    send(chunk)  // plain text, no parse_mode
```

This means one chunk failing MarkdownV2 does not affect other chunks. Each chunk independently finds the best parse mode.

## telegramify-markdown Usage

- npm package: `telegramify-markdown`
- Used ONLY for MarkdownV2 escaping (stage 3)
- Not used for table conversion or splitting
- Import and call its default export on each chunk before sending

## Files Affected

- `src/chat/telegram.ts` -- updated `sendText` and `editMessage` methods
- `src/chat/telegram-markdown.ts` -- new module for table conversion and splitting utilities
- `src/chat/telegram-markdown.test.ts` -- unit tests for the new module

## Interface Boundary

The `ChatAdapter` interface (`src/interfaces/chat-adapter.ts`) is NOT modified. `sendText` still accepts `(chatId: string, text: string)`. All rendering logic is internal to `TelegramAdapter`.
