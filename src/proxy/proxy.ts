import { HANDLEBAR_RE } from "../secrets/constants";

/** Header name used to specify the upstream base URL. */
const UPSTREAM_HEADER = "x-assurgent-upstream";

/** Headers stripped from proxy responses to prevent secret leakage. */
const AUTH_RESPONSE_HEADERS = new Set(["authorization", "x-api-key", "x-api-secret"]);

export interface ProxyConfig {
  port?: number;
  bypassWhitelist?: boolean;
  /**
   * Allowed upstream targets.
   * Each entry is either a domain (e.g. "googleapis.com") or host:port (e.g. "127.0.0.1:3000").
   * Entry without ":" matches hostname only. Entry with ":" matches hostname:port.
   */
  whitelist?: string[];
}

export interface ProxyServer {
  server: ReturnType<typeof Bun.serve>;
  port: number;
  stop(): void;
}

/**
 * Resolve all ${{secretRef.*}} handlebars in a string.
 * Throws for unknown secret names.
 */
export function resolveHandlebars(text: string, resolvedSecrets: Record<string, string>): string {
  return text.replace(HANDLEBAR_RE, (fullMatch, name: string) => {
    const secret = resolvedSecrets[name];
    if (secret === undefined) {
      throw new Error(`Unknown secretRef "${name}" in proxy request.`);
    }
    return secret;
  });
}

/**
 * Resolve handlebars in request headers.
 * Skips the "host" and "x-assurgent-upstream" headers.
 */
export function resolveHeaders(
  headers: Headers,
  resolvedSecrets: Record<string, string>,
): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    if (key === "host") continue;
    if (key === UPSTREAM_HEADER) continue;
    resolved[key] = resolveHandlebars(value, resolvedSecrets);
  }
  return resolved;
}

/**
 * Strip auth-related headers from a response.
 * Removes Authorization, X-Api-Key, X-Api-Secret, and X-Secret-* headers.
 */
export function stripAuthHeaders(headers: Headers): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    if (AUTH_RESPONSE_HEADERS.has(key.toLowerCase())) continue;
    if (key.toLowerCase().startsWith("x-secret-")) continue;
    clean[key] = value;
  }
  return clean;
}

/**
 * Derive the effective port for a URL.
 * `new URL(...)` returns "" for default ports, so we fall back to scheme defaults.
 */
function effectivePort(parsed: URL): string {
  if (parsed.port) return parsed.port;
  if (parsed.protocol === "https:") return "443";
  if (parsed.protocol === "http:") return "80";
  return "";
}

/**
 * Check if a URL matches any entry in the whitelist.
 * Whitelist entries without ":" match hostname only.
 * Whitelist entries with ":" match hostname:port.
 */
export function isUrlAllowed(url: string, whitelist: string[]): boolean {
  try {
    const parsed = new URL(url);
    return whitelist.some((entry) => {
      if (entry.includes(":")) {
        return `${parsed.hostname}:${effectivePort(parsed)}` === entry;
      }
      return parsed.hostname === entry;
    });
  } catch {
    return false;
  }
}

/**
 * Construct the target URL from the upstream header value and the request path.
 * Trims trailing / from upstream, trims leading / from path, joins with /.
 */
function buildTargetUrl(upstream: string, pathname: string, resolvedQuery: string): string {
  const trimmedUpstream = upstream.replace(/\/+$/, "");
  const trimmedPath = pathname.replace(/^\/+/, "");
  const target = trimmedPath ? `${trimmedUpstream}/${trimmedPath}` : trimmedUpstream;
  return `${target}${resolvedQuery}`;
}

/**
 * Ensure the upstream value has a scheme. Defaults to https:// if missing.
 */
function ensureScheme(upstream: string): string {
  if (/^https?:\/\//i.test(upstream)) {
    return upstream;
  }
  return `https://${upstream}`;
}

/**
 * Create and start the secret proxy server.
 * Binds to 127.0.0.1 only.
 * Routes requests using the x-assurgent-upstream header.
 * Resolves ${{secretRef.*}} in request headers, query params, and body.
 * Strips auth headers from responses.
 */
export function createProxy(
  config: ProxyConfig,
  resolvedSecrets: Record<string, string>,
): ProxyServer {
  const port = config.port ?? 9090;
  const whitelist = config.whitelist ?? [];

  const server = Bun.serve({
    port,
    hostname: "127.0.0.1",
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);

      // Read x-assurgent-upstream header
      const upstreamRaw = req.headers.get(UPSTREAM_HEADER);

      if (upstreamRaw === null) {
        return new Response(
          JSON.stringify({
            error: "Missing x-assurgent-upstream header",
            hint: "Set the x-assurgent-upstream header to the target base URL, e.g. https://googleapis.com",
          }),
          { status: 400, headers: { "content-type": "application/json" } },
        );
      }

      // Detect duplicate headers (comma-separated values indicate multiple)
      if (upstreamRaw.includes(",")) {
        return new Response(
          JSON.stringify({
            error: "Duplicate x-assurgent-upstream header. Provide exactly one upstream URL.",
          }),
          { status: 400, headers: { "content-type": "application/json" } },
        );
      }

      const upstream = ensureScheme(upstreamRaw.trim());

      // Build target URL
      const resolvedQuery = url.search ? resolveHandlebars(url.search, resolvedSecrets) : "";
      const targetUrl = buildTargetUrl(upstream, url.pathname, resolvedQuery);

      // Log warning on every request when bypassWhitelist is enabled
      if (config.bypassWhitelist) {
        console.warn(
          `WARNING: bypassWhitelist is enabled. Proxying request to ${targetUrl} without whitelist check.`,
        );
      }

      // Check whitelist
      if (!config.bypassWhitelist) {
        if (!isUrlAllowed(targetUrl, whitelist)) {
          return new Response(
            JSON.stringify({
              error: `URL not in whitelist: ${targetUrl}`,
            }),
            { status: 403, headers: { "content-type": "application/json" } },
          );
        }
      }

      try {
        // Resolve handlebars in headers (x-assurgent-upstream is already skipped)
        const resolvedReqHeaders = resolveHeaders(req.headers, resolvedSecrets);

        // Resolve handlebars in body
        let body: string | undefined;
        if (req.method !== "GET" && req.method !== "HEAD") {
          const rawBody = await req.text();
          if (rawBody) {
            body = resolveHandlebars(rawBody, resolvedSecrets);
          }
        }

        const res = await fetch(targetUrl, {
          method: req.method,
          headers: resolvedReqHeaders,
          body,
        });

        const responseHeaders = stripAuthHeaders(res.headers);

        return new Response(res.body, {
          status: res.status,
          headers: responseHeaders,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: message }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    },
  });

  return {
    server,
    port: server.port ?? port,
    stop() {
      server.stop(true);
    },
  };
}
