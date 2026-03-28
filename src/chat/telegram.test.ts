import { describe, expect, test } from "bun:test";
import { splitMessage } from "./telegram";

describe("splitMessage", () => {
  test("returns single chunk when text is under limit", () => {
    const result = splitMessage("hello world", 100);
    expect(result).toEqual(["hello world"]);
  });

  test("splits at last newline before maxLength", () => {
    const text = "line one\nline two\nline three";
    const result = splitMessage(text, 18);
    // "line one\nline two" is 17 chars, fits
    expect(result[0]).toBe("line one\nline two");
    expect(result[1]).toBe("line three");
  });

  test("hard splits at maxLength when no newlines present", () => {
    const text = "abcdefghij"; // 10 chars
    const result = splitMessage(text, 5);
    expect(result[0]).toBe("abcde");
    expect(result[1]).toBe("fghij");
  });

  test("handles multiple chunks", () => {
    const text = "aaa\nbbb\nccc\nddd\neee";
    const result = splitMessage(text, 8);
    // "aaa\nbbb" is 7 chars
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(8);
    }
  });

  test("returns empty array element for empty string", () => {
    const result = splitMessage("", 100);
    expect(result).toEqual([""]);
  });
});
