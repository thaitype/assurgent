import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { SessionManager, generateSessionName } from "./session-manager";

describe("generateSessionName", () => {
  test("produces slug-XXXX format with 4 random digits", () => {
    const name = generateSessionName("hello world");
    expect(name).toMatch(/^hello-world-\d{4}$/);
  });

  test("slugifies: lowercase and replaces non-alphanumeric with hyphens", () => {
    const name = generateSessionName("Hello World!");
    // Remove the trailing -XXXX to check slug
    const slug = name.replace(/-\d{4}$/, "");
    expect(slug).toBe("hello-world");
  });

  test("keeps Thai characters in the slug", () => {
    const name = generateSessionName("เพิ่ม dark mode");
    expect(name).toContain("เพิ่ม");
    expect(name).toMatch(/-\d{4}$/);
  });

  test("handles empty string input", () => {
    const name = generateSessionName("");
    expect(name).toMatch(/^session-\d{4}$/);
  });

  test("handles whitespace-only input", () => {
    const name = generateSessionName("   ");
    expect(name).toMatch(/^session-\d{4}$/);
  });

  test("total length is at most 20 characters", () => {
    const longMessage = "this is a very long message that exceeds fifteen characters easily";
    const name = generateSessionName(longMessage);
    expect(name.length).toBeLessThanOrEqual(20);
    expect(name).toMatch(/-\d{4}$/);
  });

  test("truncates slug to fit within 20 char limit", () => {
    const name = generateSessionName("abcdefghijklmno"); // exactly 15 chars
    expect(name.length).toBeLessThanOrEqual(20);
    expect(name).toMatch(/-\d{4}$/);
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
    expect(session.name).toMatch(/^hello-world-\d{4}$/);
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

  test("getPins returns empty object for chat with no pins", () => {
    const pins = manager.getPins("chat-1");
    expect(pins).toEqual({});
  });

  test("pinSession returns true for valid session and slot", () => {
    const session = manager.resolveSession("chat-1", "test");
    const result = manager.pinSession("chat-1", session.name, 1);
    expect(result).toBe(true);

    const pins = manager.getPins("chat-1");
    expect(pins["1"]).toBe(session.name);
  });

  test("pinSession returns false for non-existent session", () => {
    const result = manager.pinSession("chat-1", "nonexistent", 1);
    expect(result).toBe(false);
  });

  test("pinSession returns false for invalid slot", () => {
    const session = manager.resolveSession("chat-1", "test");
    expect(manager.pinSession("chat-1", session.name, 0)).toBe(false);
    expect(manager.pinSession("chat-1", session.name, 4)).toBe(false);
  });

  test("pinSession overwrites existing slot assignment", () => {
    const s1 = manager.resolveSession("chat-1", "first");
    manager.archiveActive("chat-1");
    const s2 = manager.resolveSession("chat-1", "second");

    manager.pinSession("chat-1", s1.name, 1);
    manager.pinSession("chat-1", s2.name, 1);

    const pins = manager.getPins("chat-1");
    expect(pins["1"]).toBe(s2.name);
  });

  test("removeStalePins keeps pins referencing existing sessions", () => {
    const session = manager.resolveSession("chat-1", "test");
    manager.pinSession("chat-1", session.name, 1);

    manager.removeStalePins("chat-1");
    const pins = manager.getPins("chat-1");
    expect(pins["1"]).toBe(session.name);
  });

  test("removeStalePins cleans up references to deleted sessions", () => {
    // Create a session, pin it, then rename it so the old name no longer exists
    const session = manager.resolveSession("chat-1", "test");
    manager.pinSession("chat-1", session.name, 1);
    const oldName = session.name;

    // Rename changes the key in sessions map, making the old name stale
    manager.renameActive("chat-1", "renamed");

    manager.removeStalePins("chat-1");
    const pins = manager.getPins("chat-1");
    // The pin referenced oldName which no longer exists
    expect(pins["1"]).toBeUndefined();
  });
});
