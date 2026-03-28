/**
 * The structured response returned after an agent invocation.
 */
export interface AgentResponse {
  result: string;
  sessionId: string;
  durationMs: number;
  raw: Record<string, unknown>;
}

/**
 * Options passed when invoking an agent.
 */
export interface AgentInvokeOptions {
  message: string;
  sessionId?: string;
  model?: string;
  maxTurns?: number;
  appendPrompt?: string;
}

/**
 * Adapter contract for an AI agent backend.
 * Implementations wrap a specific agent CLI or SDK.
 */
export interface AgentAdapter {
  readonly name: string;
  invoke(options: AgentInvokeOptions): Promise<AgentResponse>;
}
