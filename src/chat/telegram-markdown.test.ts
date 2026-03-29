import { describe, expect, test } from "bun:test";
import { convertTables, processMarkdown, splitMessageByParagraph } from "./telegram-markdown";

describe("convertTables", () => {
  test("converts 2-column table to flat bullets", () => {
    const input = `| Key | Value |
|-----|-------|
| Name | Alice |
| Role | Admin |`;
    const result = convertTables(input);
    expect(result).toBe("* **Name**: Alice\n* **Role**: Admin");
  });

  test("converts 3+ column table to nested bullets", () => {
    const input = `| Name | Role | Status |
|------|------|--------|
| Alice | Admin | Active |
| Bob | User | Inactive |`;
    const result = convertTables(input);
    expect(result).toBe(
      "* **Alice**\n  * Role: Admin\n  * Status: Active\n* **Bob**\n  * Role: User\n  * Status: Inactive",
    );
  });

  test("passes non-table content through unchanged", () => {
    const input = "# Heading\n\nSome **bold** text and `code`.";
    const result = convertTables(input);
    expect(result).toBe(input);
  });

  test("preserves surrounding text around a table", () => {
    const input = `Before text

| Key | Value |
|-----|-------|
| A | 1 |

After text`;
    const result = convertTables(input);
    expect(result).toContain("Before text");
    expect(result).toContain("* **A**: 1");
    expect(result).toContain("After text");
  });

  test("omits empty cells in nested bullets", () => {
    const input = `| Name | Role | Status |
|------|------|--------|
| Alice | Admin |  |`;
    const result = convertTables(input);
    expect(result).toBe("* **Alice**\n  * Role: Admin");
  });

  test("omits table with no data rows", () => {
    const input = `| Key | Value |
|-----|-------|`;
    const result = convertTables(input);
    expect(result.trim()).toBe("");
  });

  test("converts single-column table to plain bullets", () => {
    const input = `| Items |
|-------|
| Apple |
| Banana |`;
    const result = convertTables(input);
    expect(result).toBe("* Apple\n* Banana");
  });
});

describe("splitMessageByParagraph", () => {
  test("returns single chunk for short text", () => {
    const result = splitMessageByParagraph("Hello world", 4096);
    expect(result).toEqual(["Hello world"]);
  });

  test("splits at paragraph boundaries", () => {
    const para1 = "A".repeat(2000);
    const para2 = "B".repeat(2000);
    const para3 = "C".repeat(2000);
    const text = `${para1}\n\n${para2}\n\n${para3}`;
    const result = splitMessageByParagraph(text, 4096);
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(4096);
    }
  });

  test("splits long single paragraph at line boundaries", () => {
    const lines = Array.from({ length: 100 }, (_, i) => `Line ${i}: ${"x".repeat(80)}`);
    const text = lines.join("\n");
    const result = splitMessageByParagraph(text, 4096);
    expect(result.length).toBeGreaterThan(1);
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(4096);
    }
  });

  test("hard-splits a single long line", () => {
    const text = "x".repeat(10000);
    const result = splitMessageByParagraph(text, 4096);
    expect(result.length).toBeGreaterThan(1);
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(4096);
    }
  });

  test("no chunk exceeds max length", () => {
    const text = Array.from(
      { length: 50 },
      (_, i) => `Paragraph ${i}: ${"word ".repeat(200)}`,
    ).join("\n\n");
    const result = splitMessageByParagraph(text, 4096);
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(4096);
    }
  });
});

describe("processMarkdown", () => {
  test("end-to-end: table + text is converted and split", () => {
    const input = `# Title

| Key | Value |
|-----|-------|
| Name | Alice |

Some text after the table.`;
    const { raw, escaped } = processMarkdown(input);
    expect(Array.isArray(raw)).toBe(true);
    expect(Array.isArray(escaped)).toBe(true);
    expect(raw.length).toBeGreaterThan(0);
    expect(escaped.length).toBe(raw.length);
    // Table should be converted in raw output
    expect(raw.join("\n")).toContain("**Name**");
    expect(raw.join("\n")).not.toContain("|-----|");
  });

  test("returns arrays of strings", () => {
    const { raw, escaped } = processMarkdown("Simple text");
    expect(raw).toEqual(["Simple text"]);
    expect(typeof escaped[0]).toBe("string");
  });
});
