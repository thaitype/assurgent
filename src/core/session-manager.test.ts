import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { SessionManager, generateSessionName } from "./session-manager";

describe("generateSessionName", () => {
  test("produces YYYY-MM-DD-slug format", () => {
    const name = generateSessionName("hello world");
    expect(name).toMatch(/^\d{4}-\d{2}-\d{2}-.+$/);
  });

  test("slugifies: lowercase and replaces non-alphanumeric with hyphens", () => {
    const name = generateSessionName("Hello World! Fix Bug");
    const slug = name.split(/^\d{4}-\d{2}-\d{2}-/)[1];
    expect(slug).toBe("hello-world-fix-bug");
  });

  test("keeps Thai characters in the slug", () => {
    const name = generateSessionName("เพิ่ม dark mode");
    const slug = name.split(/^\d{4}-\d{2}-\d{2}-/)[1];
    expect(slug).toContain("เพิ่ม");
  });

  test("handles empty string input", () => {
    const name = generateSessionName("");
    expect(name).toMatch(/^\d{4}-\d{2}-\d{2}-session$/);
  });

  test("handles whitespace-only input", () => {
    const name = generateSessionName("   ");
    expect(name).toMatch(/^\d{4}-\d{2}-\d{2}-session$/);
  });

  test("truncates long messages to ~30 chars before slugifying", () => {
    const longMessage = "this is a very long message that exceeds thirty characters easily";
    const name = generateSessionName(longMessage);
    const slug = name.split(/^\d{4}-\d{2}-\d{2}-/)[1];
    expect(slug).toBe("this-is-a-very-long-message-th");
  });
});

describe("SessionManager", () => {
  let tmpDir: string;
  let manager: SessionManager;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "session-test-"));
    manager = new SessionManager({ statePath: tmpDir });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("resolveSession creates new session when none active", () => {
    const session = manager.resolveSession("chat-1", "hello world");
    expect(session.chatId).toBe("chat-1");
    expect(session.turnCount).toBe(0);
    expect(session.agentSessionId).toBe("");
    expect(session.name).toMatch(/^\d{4}-\d{2}-\d{2}-hello-world$/);
  });

  test("resolveSession returns existing active session", () => {
    const first = manager.resolveSession("chat-1", "hello world");
    const second = manager.resolveSession("chat-1", "different message");
    expect(second.name).toBe(first.name);
  });

  test("archiveActive clears active pointer", () => {
    manager.resolveSession("chat-1", "hello");
    manager.archiveActive("chat-1");
    const active = manager.getActive("chat-1");
    expect(active).toBeUndefined();
  });

  test("extendSession increases turn limit using override object", () => {
    manager.resolveSession("chat-1", "hello");
    const result = manager.extendSession("chat-1", 10, 20);
    expect(result).toBe(true);

    const session = manager.getActive("chat-1");
    expect(session?.override?.turnLimit).toBe(30);
  });

  test("extendSession stacks on existing override", () => {
    manager.resolveSession("chat-1", "hello");
    manager.extendSession("chat-1", 10, 20);
    manager.extendSession("chat-1", 5, 20);

    const session = manager.getActive("chat-1");
    expect(session?.override?.turnLimit).toBe(35);
  });

  test("extendSession returns false when no active session", () => {
    const result = manager.extendSession("chat-1", 10, 20);
    expect(result).toBe(false);
  });

  test("setModelOverride sets model on active session", () => {
    manager.resolveSession("chat-1", "hello");
    const result = manager.setModelOverride("chat-1", "opus");
    expect(result).toBe(true);

    const session = manager.getActive("chat-1");
    expect(session?.override?.model).toBe("opus");
  });

  test("setModelOverride clears model when passed undefined", () => {
    manager.resolveSession("chat-1", "hello");
    manager.setModelOverride("chat-1", "opus");
    manager.setModelOverride("chat-1", undefined);

    const session = manager.getActive("chat-1");
    expect(session?.override?.model).toBeUndefined();
  });

  test("setModelOverride returns false when no active session", () => {
    const result = manager.setModelOverride("chat-1", "opus");
    expect(result).toBe(false);
  });

  test("setModelOverride preserves turnLimit override", () => {
    manager.resolveSession("chat-1", "hello");
    manager.extendSession("chat-1", 10, 20);
    manager.setModelOverride("chat-1", "sonnet");

    const session = manager.getActive("chat-1");
    expect(session?.override?.turnLimit).toBe(30);
    expect(session?.override?.model).toBe("sonnet");
  });

  test("renameActive updates session name and mappings", () => {
    manager.resolveSession("chat-1", "old name");
    const renamed = manager.renameActive("chat-1", "new-name");
    expect(renamed).toBe(true);

    const active = manager.getActive("chat-1");
    expect(active?.name).toBe("new-name");
  });

  test("listSessions returns sorted by lastMessageAt descending", () => {
    const s1 = manager.resolveSession("chat-1", "first session");
    manager.updateSession(s1.name, { lastMessageAt: "2025-01-01T00:00:00Z" });

    manager.archiveActive("chat-1");

    const s2 = manager.resolveSession("chat-1", "second session");
    manager.updateSession(s2.name, { lastMessageAt: "2025-06-01T00:00:00Z" });

    const list = manager.listSessions("chat-1");
    expect(list.length).toBe(2);
    expect(list[0].name).toBe(s2.name);
    expect(list[1].name).toBe(s1.name);
  });
});
