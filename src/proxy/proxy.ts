import picomatch from "picomatch";
import { HANDLEBAR_RE } from "../secrets/constants";

/** Headers stripped from proxy responses to prevent secret leakage. */
const AUTH_RESPONSE_HEADERS = new Set(["authorization", "x-api-key", "x-api-secret"]);

export interface ProxyConfig {
  port?: number;
  bypassWhitelist?: boolean;
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
 * Skips the "host" header since it will be set for the target.
 */
export function resolveHeaders(
  headers: Headers,
  resolvedSecrets: Record<string, string>,
): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    if (key === "host") continue;
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

/** Strip http:// or https:// protocol prefix from a URL string. */
function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

/**
 * Check if a URL matches any pattern in the whitelist.
 * Strips protocol prefixes from both the URL and patterns before matching
 * so that `http://example.com/path` matches a pattern like `example.com/path/**`.
 * Uses picomatch for glob matching.
 */
export function isUrlAllowed(url: string, whitelist: string[]): boolean {
  const normalizedUrl = stripProtocol(url);
  return whitelist.some((pattern) => picomatch.isMatch(normalizedUrl, stripProtocol(pattern)));
}

/**
 * Create and start the secret proxy server.
 * Binds to 127.0.0.1 only.
 * Resolves ${{secretRef.*}} in request headers, query params, and body.
 * Strips auth headers from responses.
 */
export function createProxy(
  config: ProxyConfig,
  resolvedSecrets: Record<string, string>,
): ProxyServer {
  const port = config.port ?? 9090;
  const whitelist = config.whitelist ?? [];

  if (config.bypassWhitelist) {
    console.warn(
      "WARNING: Proxy bypassWhitelist is enabled. All target URLs are allowed. Use only for development.",
    );
  }

  const server = Bun.serve({
    port,
    hostname: "127.0.0.1",
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);
      const pathAfterProxy = url.pathname.replace(/^\/proxy\//, "");

      if (!url.pathname.startsWith("/proxy/")) {
        return new Response(JSON.stringify({ error: "Proxy requests must use /proxy/ prefix." }), {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }

      // Check whitelist
      if (!config.bypassWhitelist) {
        if (!isUrlAllowed(pathAfterProxy, whitelist)) {
          return new Response(
            JSON.stringify({
              error: `URL not in whitelist: ${pathAfterProxy}`,
            }),
            { status: 403, headers: { "content-type": "application/json" } },
          );
        }
      }

      try {
        // Resolve handlebars in query string
        const resolvedQuery = url.search ? resolveHandlebars(url.search, resolvedSecrets) : "";

        // Resolve handlebars in headers
        const resolvedReqHeaders = resolveHeaders(req.headers, resolvedSecrets);

        // Resolve handlebars in body
        let body: string | undefined;
        if (req.method !== "GET" && req.method !== "HEAD") {
          const rawBody = await req.text();
          if (rawBody) {
            body = resolveHandlebars(rawBody, resolvedSecrets);
          }
        }

        // Default to https:// unless the path already includes a protocol
        const hasProtocol = /^https?:\/\//.test(pathAfterProxy);
        const targetUrl = hasProtocol
          ? `${pathAfterProxy}${resolvedQuery}`
          : `https://${pathAfterProxy}${resolvedQuery}`;

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
