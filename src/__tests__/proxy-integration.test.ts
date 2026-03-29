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
      const res = await fetch(
        `http://127.0.0.1:${proxy.port}/proxy/http://${targetHost}/test-path`,
        {
          headers: {
            Authorization: "Bearer ${{secretRef.apiToken}}",
            "Content-Type": "application/json",
          },
        },
      );

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
      };
      expect(json.receivedAuth).toBe("Bearer real-secret-token");
      expect(json.path).toBe("/test-path");
    } finally {
      proxy.stop();
    }
  });

  test("resolves secretRef in query parameters", async () => {
    const proxy = createProxy({ port: 0, bypassWhitelist: true }, { apiKey: "secret-key-value" });

    try {
      const res = await fetch(
        `http://127.0.0.1:${proxy.port}/proxy/http://${targetHost}/data?key=$\{{secretRef.apiKey}}`,
      );

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
      const res = await fetch(`http://127.0.0.1:${proxy.port}/proxy/http://${targetHost}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  test("whitelist blocks non-matching URLs", async () => {
    const proxy = createProxy(
      {
        port: 0,
        bypassWhitelist: false,
        whitelist: ["allowed.com/**"],
      },
      {},
    );

    try {
      const res = await fetch(`http://127.0.0.1:${proxy.port}/proxy/http://${targetHost}/data`);

      expect(res.status).toBe(403);
      const json = (await res.json()) as { error: string };
      expect(json.error).toContain("not in whitelist");
    } finally {
      proxy.stop();
    }
  });

  test("whitelist allows matching URLs", async () => {
    const proxy = createProxy(
      {
        port: 0,
        bypassWhitelist: false,
        whitelist: [`http://${targetHost}/**`],
      },
      {},
    );

    try {
      const res = await fetch(`http://127.0.0.1:${proxy.port}/proxy/http://${targetHost}/allowed`);

      expect(res.status).toBe(200);
    } finally {
      proxy.stop();
    }
  });

  test("returns 500 for unknown secretRef in request", async () => {
    const proxy = createProxy({ port: 0, bypassWhitelist: true }, {});

    try {
      const res = await fetch(`http://127.0.0.1:${proxy.port}/proxy/http://${targetHost}/test`, {
        headers: {
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
});
