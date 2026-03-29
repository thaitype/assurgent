import telegramifyMarkdown from "telegramify-markdown";

/**
 * Detects markdown tables in text and converts them to bullet-list format
 * suitable for Telegram display.
 *
 * - 2-column tables become flat bullets: `* **key**: value`
 * - 3+ column tables become nested bullets with bold first column
 * - Single-column tables become plain bullet lists
 * - Tables with no data rows are omitted
 * - Empty cells are omitted from output
 */
export function convertTables(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    // Check if current line could be a table header row
    if (isTableRow(lines[i]) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const headers = parseCells(lines[i]);
      const separatorIndex = i + 1;
      const dataRows: string[][] = [];

      // Collect data rows
      let j = separatorIndex + 1;
      while (j < lines.length && isTableRow(lines[j])) {
        dataRows.push(parseCells(lines[j]));
        j++;
      }

      if (dataRows.length === 0) {
        // Table with no data rows: omit entirely
        i = j;
        continue;
      }

      const converted = convertTableToList(headers, dataRows);
      result.push(converted);
      i = j;
    } else {
      result.push(lines[i]);
      i++;
    }
  }

  return result.join("\n");
}

function isTableRow(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  return trimmed.includes("|");
}

function isSeparatorRow(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  // Match patterns like |---|, |---|---|, | --- | --- |, |:---:|:---|
  return /^\|[\s:-]+(\|[\s:-]*)*\|?\s*$/.test(trimmed);
}

function parseCells(line: string): string[] {
  const trimmed = line.trim();
  // Remove leading and trailing pipes, then split by pipe
  const withoutOuterPipes = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return withoutOuterPipes.split("|").map((cell) => cell.trim());
}

function convertTableToList(headers: string[], dataRows: string[][]): string {
  const columnCount = headers.length;
  const lines: string[] = [];

  if (columnCount === 1) {
    // Single-column: plain bullet list
    for (const row of dataRows) {
      const value = row[0]?.trim();
      if (value) {
        lines.push(`* ${value}`);
      }
    }
  } else if (columnCount === 2) {
    // 2-column: key-value flat bullets
    for (const row of dataRows) {
      const key = row[0]?.trim();
      const value = row[1]?.trim();
      if (key && value) {
        lines.push(`* **${key}**: ${value}`);
      } else if (key) {
        lines.push(`* **${key}**`);
      }
    }
  } else {
    // 3+ columns: nested bullets
    for (const row of dataRows) {
      const label = row[0]?.trim();
      if (!label) continue;
      lines.push(`* **${label}**`);
      for (let c = 1; c < headers.length; c++) {
        const value = row[c]?.trim();
        if (value) {
          lines.push(`  * ${headers[c]}: ${value}`);
        }
      }
    }
  }

  return lines.join("\n");
}

/**
 * Splits text into chunks respecting Telegram's message size limit.
 *
 * Strategy:
 * 1. Split on paragraph boundaries (`\n\n`)
 * 2. If a single paragraph exceeds maxLength, split on line boundaries (`\n`)
 * 3. If a single line exceeds maxLength, hard-split at maxLength
 */
export function splitMessageByParagraph(text: string, maxLength = 4096): string[] {
  if (text.length <= maxLength) return [text];

  const paragraphs = text.split("\n\n");
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxLength) {
      // Flush current chunk first
      if (current) {
        chunks.push(current);
        current = "";
      }
      // Fallback: split long paragraph by lines
      const lineChunks = splitByLines(paragraph, maxLength);
      chunks.push(...lineChunks);
      continue;
    }

    if (current === "") {
      current = paragraph;
    } else {
      const combined = `${current}\n\n${paragraph}`;
      if (combined.length <= maxLength) {
        current = combined;
      } else {
        chunks.push(current);
        current = paragraph;
      }
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function splitByLines(text: string, maxLength: number): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let current = "";

  for (const line of lines) {
    if (line.length > maxLength) {
      // Flush current
      if (current) {
        chunks.push(current);
        current = "";
      }
      // Hard-split long line
      let remaining = line;
      while (remaining.length > maxLength) {
        chunks.push(remaining.slice(0, maxLength));
        remaining = remaining.slice(maxLength);
      }
      if (remaining) {
        current = remaining;
      }
      continue;
    }

    if (current === "") {
      current = line;
    } else {
      const combined = `${current}\n${line}`;
      if (combined.length <= maxLength) {
        current = combined;
      } else {
        chunks.push(current);
        current = line;
      }
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

/**
 * Full rendering pipeline: converts tables, splits message, and escapes for MarkdownV2.
 * Returns an object with both raw chunks and escaped chunks.
 */
export function processMarkdown(text: string): { raw: string[]; escaped: string[] } {
  const withConvertedTables = convertTables(text);
  const rawChunks = splitMessageByParagraph(withConvertedTables, 4096);
  const escapedChunks = rawChunks.map((chunk) => telegramifyMarkdown(chunk, "escape"));
  return { raw: rawChunks, escaped: escapedChunks };
}

/**
 * Sends a chunk with three-tier fallback:
 * 1. MarkdownV2 (escaped chunk)
 * 2. Legacy Markdown (raw chunk)
 * 3. Plain text (raw chunk, no parse mode)
 */
export async function sendWithFallback(
  sendFn: (text: string, parseMode?: string) => Promise<void>,
  rawChunk: string,
  escapedChunk: string,
): Promise<void> {
  try {
    await sendFn(escapedChunk, "MarkdownV2");
  } catch {
    try {
      await sendFn(rawChunk, "Markdown");
    } catch {
      await sendFn(rawChunk);
    }
  }
}
