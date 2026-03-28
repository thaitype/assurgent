import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export interface Session {
  name: string;
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
  sessions: Record<string, Session>;
  activeSession: Record<string, string>;
}

/**
 * Generate a session name from the first message.
 * Format: YYYY-MM-DD-<slug>
 * Slug: first ~30 chars, lowercase, non-alphanumeric (except Thai characters) replaced with hyphens,
 * leading/trailing hyphens trimmed. Falls back to "session" if slug is empty.
 */
export function generateSessionName(message: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);

  const slug = message
    .slice(0, 30)
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    return `${date}-session`;
  }

  return `${date}-${slug}`;
}

export class SessionManager {
  private state: SessionState = { sessions: {}, activeSession: {} };
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

    const activeName = this.state.activeSession[chatId];

    if (activeName) {
      const active = this.state.sessions[activeName];
      if (active) {
        return active;
      }
    }

    const name = generateSessionName(message);
    const now = new Date().toISOString();
    const session: Session = {
      name,
      agentSessionId: "",
      chatId,
      createdAt: now,
      lastMessageAt: now,
      turnCount: 0,
    };

    this.state.sessions[name] = session;
    this.state.activeSession[chatId] = name;
    this.save();

    return session;
  }

  /** Merge updates into an existing session, then persist. */
  updateSession(name: string, updates: Partial<Session>): void {
    this.load();
    const session = this.state.sessions[name];
    if (!session) return;
    Object.assign(session, updates);
    this.save();
  }

  /** Extend the active session's turn limit by additionalTurns. */
  extendSession(chatId: string, additionalTurns: number, configTurnLimit: number): boolean {
    this.load();
    const name = this.state.activeSession[chatId];
    if (!name) return false;
    const session = this.state.sessions[name];
    if (!session) return false;

    const currentLimit = session.override?.turnLimit ?? configTurnLimit;
    session.override = { ...session.override, turnLimit: currentLimit + additionalTurns };
    this.save();
    return true;
  }

  /** Set or clear the model override for the active session. Returns false if no active session. */
  setModelOverride(chatId: string, model: string | undefined): boolean {
    this.load();
    const name = this.state.activeSession[chatId];
    if (!name) return false;
    const session = this.state.sessions[name];
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
   * Set a named session as active for a chatId.
   * Returns false if the session does not exist.
   */
  setActive(chatId: string, name: string): boolean {
    this.load();
    if (!this.state.sessions[name]) return false;
    this.state.activeSession[chatId] = name;
    this.save();
    return true;
  }

  /**
   * Rename the active session for a chatId.
   * Returns false if there is no active session.
   */
  renameActive(chatId: string, newName: string): boolean {
    this.load();
    const activeName = this.state.activeSession[chatId];
    if (!activeName) return false;

    const session = this.state.sessions[activeName];
    if (!session) return false;

    session.name = newName;
    delete this.state.sessions[activeName];
    this.state.sessions[newName] = session;
    this.state.activeSession[chatId] = newName;
    this.save();
    return true;
  }

  /** Return the active session for a chatId, or undefined if none. */
  getActive(chatId: string): Session | undefined {
    this.load();
    const name = this.state.activeSession[chatId];
    if (!name) return undefined;
    return this.state.sessions[name];
  }

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;

    try {
      const raw = readFileSync(this.sessionsFile, "utf-8");
      this.state = JSON.parse(raw) as SessionState;
    } catch {
      this.state = { sessions: {}, activeSession: {} };
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
