import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export interface Session {
  /** Locally generated UUID. Permanent key, never changes. */
  id: string;
  /** Human-friendly display label. Renameable. */
  name: string;
  /** Claude Code's session ID for conversation continuity. */
  agentSessionId: string;
  chatId: string;
  createdAt: string;
  lastMessageAt: string;
  turnCount: number;
  override?: {
    turnLimit?: number; // set by /extend — effective limit = override.turnLimit ?? config.turnLimit
    model?: string; // set by /model — effective model = override.model ?? config model
  };
}

export interface SessionState {
  /** Key = session id (UUID). Was keyed by name. */
  sessions: Record<string, Session>;
  /** Key = chatId, value = session id (UUID). Was session name. */
  activeSession: Record<string, string>;
  /** Key = chatId, value = slot map (slot -> session id). Was session name. */
  pinnedSessions: Record<string, PinSlots>;
}

/** Maps slot number (1-3) to session id (UUID). */
export type PinSlots = Record<string, string>;

/**
 * Generate a session name from the first message.
 * Format: <slug>-<4 random digits>
 * Slug: first ~15 chars, lowercase, non-alphanumeric (except Thai characters) replaced with hyphens,
 * leading/trailing hyphens trimmed. Falls back to "session" if slug is empty.
 * Total name max 20 characters.
 */
export function generateSessionName(message: string): string {
  const digits = String(Math.floor(Math.random() * 10000)).padStart(4, "0");

  const slug = message
    .slice(0, 15)
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    return `session-${digits}`;
  }

  // Ensure total length <= 20 chars: slug + "-" + 4 digits = slug max 15
  const maxSlugLen = 20 - 1 - 4; // 15
  const trimmedSlug = slug.slice(0, maxSlugLen).replace(/-+$/, "");

  return `${trimmedSlug}-${digits}`;
}

export class SessionManager {
  private state: SessionState = { sessions: {}, activeSession: {}, pinnedSessions: {} };
  private loaded = false;
  private readonly sessionsFile: string;

  constructor(private config: { statePath: string }) {
    this.sessionsFile = path.join(config.statePath, "sessions.json");
  }

  /**
   * Resolve the session to use for a new message.
   * Returns the active session if one exists, otherwise creates a new one.
   */
  resolveSession(chatId: string, message: string): Session {
    this.load();

    const activeId = this.state.activeSession[chatId];

    if (activeId) {
      const active = this.state.sessions[activeId];
      if (active) {
        return active;
      }
    }

    const id = crypto.randomUUID();
    const name = generateSessionName(message);
    const now = new Date().toISOString();
    const session: Session = {
      id,
      name,
      agentSessionId: "",
      chatId,
      createdAt: now,
      lastMessageAt: now,
      turnCount: 0,
    };

    this.state.sessions[id] = session;
    this.state.activeSession[chatId] = id;
    this.save();

    return session;
  }

  /** Merge updates into an existing session by id, then persist. */
  updateSession(id: string, updates: Partial<Session>): void {
    this.load();
    const session = this.state.sessions[id];
    if (!session) return;
    Object.assign(session, updates);
    this.save();
  }

  /** Extend the active session's turn limit by additionalTurns. */
  extendSession(chatId: string, additionalTurns: number, configTurnLimit: number): boolean {
    this.load();
    const id = this.state.activeSession[chatId];
    if (!id) return false;
    const session = this.state.sessions[id];
    if (!session) return false;

    const currentLimit = session.override?.turnLimit ?? configTurnLimit;
    session.override = { ...session.override, turnLimit: currentLimit + additionalTurns };
    this.save();
    return true;
  }

  /** Set or clear the model override for the active session. Returns false if no active session. */
  setModelOverride(chatId: string, model: string | undefined): boolean {
    this.load();
    const id = this.state.activeSession[chatId];
    if (!id) return false;
    const session = this.state.sessions[id];
    if (!session) return false;

    if (model === undefined) {
      if (session.override) {
        session.override.model = undefined;
      }
    } else {
      session.override = { ...session.override, model };
    }
    this.save();
    return true;
  }

  /** Clear the active session pointer for a chatId. Session data is preserved. */
  archiveActive(chatId: string): void {
    this.load();
    delete this.state.activeSession[chatId];
    this.save();
  }

  /** Return all sessions for a chatId, sorted by lastMessageAt descending. */
  listSessions(chatId: string): Session[] {
    this.load();
    return Object.values(this.state.sessions)
      .filter((s) => s.chatId === chatId)
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  /**
   * Set a session as active for a chatId by session id.
   * Returns false if the session does not exist.
   */
  setActive(chatId: string, id: string): boolean {
    this.load();
    if (!this.state.sessions[id]) return false;
    this.state.activeSession[chatId] = id;
    this.save();
    return true;
  }

  /** Look up a session by its id. */
  getSessionById(id: string): Session | undefined {
    this.load();
    return this.state.sessions[id];
  }

  /** Find a session by name and chatId. Linear scan, returns first match or undefined. */
  findSessionByName(name: string, chatId: string): Session | undefined {
    this.load();
    return Object.values(this.state.sessions).find((s) => s.name === name && s.chatId === chatId);
  }

  /**
   * Rename the active session for a chatId.
   * Session stays at the same id key; only the name field changes.
   * Returns false if there is no active session.
   */
  renameActive(chatId: string, newName: string): boolean {
    this.load();
    const activeId = this.state.activeSession[chatId];
    if (!activeId) return false;

    const session = this.state.sessions[activeId];
    if (!session) return false;

    session.name = newName;
    this.save();
    return true;
  }

  /** Return the active session for a chatId, or undefined if none. */
  getActive(chatId: string): Session | undefined {
    this.load();
    const id = this.state.activeSession[chatId];
    if (!id) return undefined;
    return this.state.sessions[id];
  }

  /**
   * Pin a session to a quick-switch slot (1-3) for a chat.
   * Accepts session name, resolves to id internally.
   * Returns false if the session does not exist or slot is invalid.
   */
  pinSession(chatId: string, name: string, slot: number): boolean {
    this.load();
    if (slot < 1 || slot > 3) return false;

    // Resolve name to session
    const session = this.findSessionByName(name, chatId);
    if (!session) return false;

    if (!this.state.pinnedSessions[chatId]) {
      this.state.pinnedSessions[chatId] = {};
    }
    this.state.pinnedSessions[chatId][String(slot)] = session.id;
    this.save();
    return true;
  }

  /** Return the pin slots for a chat. */
  getPins(chatId: string): PinSlots {
    this.load();
    return this.state.pinnedSessions[chatId] ?? {};
  }

  /** Remove pins that reference sessions which no longer exist (by id). */
  removeStalePins(chatId: string): void {
    this.load();
    const pins = this.state.pinnedSessions[chatId];
    if (!pins) return;

    let changed = false;
    for (const slot of Object.keys(pins)) {
      const sessionId = pins[slot];
      if (!this.state.sessions[sessionId]) {
        delete pins[slot];
        changed = true;
      }
    }

    if (changed) {
      this.save();
    }
  }

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;

    try {
      const raw = readFileSync(this.sessionsFile, "utf-8");
      const parsed = JSON.parse(raw) as SessionState;
      this.state = {
        sessions: parsed.sessions ?? {},
        activeSession: parsed.activeSession ?? {},
        pinnedSessions: parsed.pinnedSessions ?? {},
      };
    } catch {
      this.state = { sessions: {}, activeSession: {}, pinnedSessions: {} };
    }
  }

  private save(): void {
    void this.saveAsync();
  }

  private async saveAsync(): Promise<void> {
    try {
      await mkdir(path.dirname(this.sessionsFile), { recursive: true });
      await Bun.write(this.sessionsFile, JSON.stringify(this.state, null, 2));
    } catch (err) {
      console.error("SessionManager: failed to save sessions.json", err);
    }
  }
}
