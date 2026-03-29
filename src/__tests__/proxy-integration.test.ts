import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { type ProxyServer, createProxy } from "../proxy/proxy";

describe("proxy integration: end-to-end request handling", () => {
  let targetServer: ReturnType<typeof Bun.serve>;
  let targetHost: string;

  beforeAll(() => {
    // Local echo server that returns request details
    targetServer = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      async fetch(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const body = req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined;

        return new Response(
          JSON.stringify({
            method: req.method,
            path: url.pathname,
            query: url.search,
            receivedAuth: req.headers.get("authorization"),
            receivedApiKey: req.headers.get("x-api-key"),
            receivedUpstreamHeader: req.headers.get("x-assurgent-upstream"),
            body,
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              // Echo auth headers to verify stripping
              Authorization: "Bearer should-be-stripped",
              "X-Api-Key": "should-be-stripped",
              "X-Secret-Custom": "should-be-stripped",
              "X-Normal-Header": "should-remain",
            },
          },
        );
      },
    });

    targetHost = `127.0.0.1:${targetServer.port}`;
  });

  afterAll(() => {
    targetServer?.stop(true);
  });

  test("resolves secretRef in headers and strips auth from response", async () => {
    const proxy = createProxy(
      { port: 0, bypassWhitelist: true },
      { apiToken: "real-secret-token" },
    );

    try {
      const res = await fetch(`http://127.0.0.1:${proxy.port}/test-path`, {
        headers: {
          "x-assurgent-upstream": `http://${targetHost}`,
          Authorization: "Bearer ${{secretRef.apiToken}}",
          "Content-Type": "application/json",
        },
      });

      expect(res.status).toBe(200);

      // Verify auth headers are stripped from the response
      expect(res.headers.get("authorization")).toBeNull();
      expect(res.headers.get("x-api-key")).toBeNull();
      expect(res.headers.get("x-secret-custom")).toBeNull();
      expect(res.headers.get("x-normal-header")).toBe("should-remain");

      // Verify the target received the resolved secret
      const json = (await res.json()) as {
        receivedAuth: string;
        path: string;
        receivedUpstreamHeader: string | null;
      };
      expect(json.receivedAuth).toBe("Bearer real-secret-token");
      expect(json.path).toBe("/test-path");
      // Verify x-assurgent-upstream is NOT forwarded to upstream
      expect(json.receivedUpstreamHeader).toBeNull();
    } finally {
      proxy.stop();
    }
  });

  test("resolves secretRef in query parameters", async () => {
    const proxy = createProxy({ port: 0, bypassWhitelist: true }, { apiKey: "secret-key-value" });

    try {
      const res = await fetch(`http://127.0.0.1:${proxy.port}/data?key=$\{{secretRef.apiKey}}`, {
        headers: { "x-assurgent-upstream": `http://${targetHost}` },
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as { query: string };
      expect(json.query).toBe("?key=secret-key-value");
    } finally {
      proxy.stop();
    }
  });

  test("resolves secretRef in POST body", async () => {
    const proxy = createProxy(
      { port: 0, bypassWhitelist: true },
      { webhookSecret: "hook-secret-123" },
    );

    try {
      const res = await fetch(`http://127.0.0.1:${proxy.port}/webhook`, {
        method: "POST",
        headers: {
          "x-assurgent-upstream": `http://${targetHost}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: "${{secretRef.webhookSecret}}",
        }),
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as { body: string };
      const parsedBody = JSON.parse(json.body) as { secret: string };
      expect(parsedBody.secret).toBe("hook-secret-123");
    } finally {
      proxy.stop();
    }
  });

  test("whitelist blocks non-matching domains", async () => {
    const proxy = createProxy(
      {
        port: 0,
        bypassWhitelist: false,
        whitelist: ["allowed.com"],
      },
      {},
    );

    try {
      const res = await fetch(`http://127.0.0.1:${proxy.port}/data`, {
        headers: { "x-assurgent-upstream": `http://${targetHost}` },
      });

      expect(res.status).toBe(403);
      const json = (await res.json()) as { error: string };
      expect(json.error).toContain("not in whitelist");
    } finally {
      proxy.stop();
    }
  });

  test("whitelist allows matching domains", async () => {
    const proxy = createProxy(
      {
        port: 0,
        bypassWhitelist: false,
        whitelist: ["127.0.0.1"],
      },
      {},
    );

    try {
      const res = await fetch(`http://127.0.0.1:${proxy.port}/allowed`, {
        headers: { "x-assurgent-upstream": `http://${targetHost}` },
      });

      expect(res.status).toBe(200);
    } finally {
      proxy.stop();
    }
  });

  test("returns 500 for unknown secretRef in request", async () => {
    const proxy = createProxy({ port: 0, bypassWhitelist: true }, {});

    try {
      const res = await fetch(`http://127.0.0.1:${proxy.port}/test`, {
        headers: {
          "x-assurgent-upstream": `http://${targetHost}`,
          Authorization: "${{secretRef.nonExistent}}",
        },
      });

      expect(res.status).toBe(500);
      const json = (await res.json()) as { error: string };
      expect(json.error).toContain("Unknown secretRef");
    } finally {
      proxy.stop();
    }
  });

  test("handles trailing path in upstream header correctly", async () => {
    const proxy = createProxy({ port: 0, bypassWhitelist: true }, {});

    try {
      const res = await fetch(`http://127.0.0.1:${proxy.port}/events`, {
        headers: { "x-assurgent-upstream": `http://${targetHost}/v1/` },
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as { path: string };
      expect(json.path).toBe("/v1/events");
    } finally {
      proxy.stop();
    }
  });

  test("defaults to https when upstream header has no scheme", async () => {
    // Use the local echo server but specify it without a scheme.
    // The proxy will prepend https://, which won't match our HTTP echo server,
    // so we expect a connection error (500). The key assertion is that we don't
    // get 400 (missing header) -- the header was accepted and the scheme defaulted.
    const proxy = createProxy({ port: 0, bypassWhitelist: true }, {});

    try {
      const res = await fetch(`http://127.0.0.1:${proxy.port}/path`, {
        headers: { "x-assurgent-upstream": targetHost },
      });

      // The proxy attempted https://<targetHost>/path which will fail since
      // our echo server is HTTP-only. We accept any server error status.
      expect(res.status).toBeGreaterThanOrEqual(500);
    } finally {
      proxy.stop();
    }
  });
});
