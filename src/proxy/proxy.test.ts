import { describe, expect, test } from "bun:test";
import {
  type ProxyServer,
  createProxy,
  isUrlAllowed,
  resolveHandlebars,
  resolveHeaders,
  stripAuthHeaders,
} from "./proxy";

describe("resolveHandlebars", () => {
  const secrets = {
    token: "my-secret-token",
    apiKey: "abc123",
  };

  test("resolves a full handlebar", () => {
    expect(resolveHandlebars("${{secretRef.token}}", secrets)).toBe("my-secret-token");
  });

  test("resolves a partial string with handlebar", () => {
    expect(resolveHandlebars("Bearer ${{secretRef.token}}", secrets)).toBe(
      "Bearer my-secret-token",
    );
  });

  test("resolves multiple handlebars", () => {
    expect(resolveHandlebars("${{secretRef.token}}:${{secretRef.apiKey}}", secrets)).toBe(
      "my-secret-token:abc123",
    );
  });

  test("returns plain strings unchanged", () => {
    expect(resolveHandlebars("no handlebars here", secrets)).toBe("no handlebars here");
  });

  test("throws for unknown secretRef", () => {
    expect(() => resolveHandlebars("${{secretRef.unknown}}", secrets)).toThrow(
      'Unknown secretRef "unknown"',
    );
  });
});

describe("resolveHeaders", () => {
  const secrets = { token: "my-secret-token" };

  test("resolves handlebars in header values", () => {
    const headers = new Headers({
      Authorization: "Bearer ${{secretRef.token}}",
      "Content-Type": "application/json",
    });
    const resolved = resolveHeaders(headers, secrets);
    expect(resolved.authorization).toBe("Bearer my-secret-token");
    expect(resolved["content-type"]).toBe("application/json");
  });

  test("skips the host header", () => {
    const headers = new Headers({
      Host: "example.com",
      Authorization: "Bearer ${{secretRef.token}}",
    });
    const resolved = resolveHeaders(headers, secrets);
    expect(resolved.host).toBeUndefined();
    expect(resolved.authorization).toBe("Bearer my-secret-token");
  });

  test("skips the x-assurgent-upstream header", () => {
    const headers = new Headers({
      "x-assurgent-upstream": "https://googleapis.com",
      Authorization: "Bearer ${{secretRef.token}}",
    });
    const resolved = resolveHeaders(headers, secrets);
    expect(resolved["x-assurgent-upstream"]).toBeUndefined();
    expect(resolved.authorization).toBe("Bearer my-secret-token");
  });
});

describe("stripAuthHeaders", () => {
  test("strips Authorization header", () => {
    const headers = new Headers({
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    });
    const clean = stripAuthHeaders(headers);
    expect(clean.authorization).toBeUndefined();
    expect(clean["content-type"]).toBe("application/json");
  });

  test("strips X-Api-Key header", () => {
    const headers = new Headers({
      "X-Api-Key": "secret",
      "Content-Type": "text/plain",
    });
    const clean = stripAuthHeaders(headers);
    expect(clean["x-api-key"]).toBeUndefined();
  });

  test("strips X-Api-Secret header", () => {
    const headers = new Headers({
      "X-Api-Secret": "secret",
    });
    const clean = stripAuthHeaders(headers);
    expect(clean["x-api-secret"]).toBeUndefined();
  });

  test("strips X-Secret-* headers", () => {
    const headers = new Headers({
      "X-Secret-Token": "secret",
      "X-Secret-Key": "key",
      "Content-Length": "42",
    });
    const clean = stripAuthHeaders(headers);
    expect(clean["x-secret-token"]).toBeUndefined();
    expect(clean["x-secret-key"]).toBeUndefined();
    expect(clean["content-length"]).toBe("42");
  });
});

describe("isUrlAllowed", () => {
  test("matches exact domain", () => {
    expect(isUrlAllowed("https://googleapis.com/calendar/v3/events", ["googleapis.com"])).toBe(
      true,
    );
  });

  test("rejects non-matching domain", () => {
    expect(isUrlAllowed("https://evil.com/steal-data", ["googleapis.com"])).toBe(false);
  });

  test("matches against multiple domains", () => {
    const whitelist = ["googleapis.com", "graph.microsoft.com"];
    expect(isUrlAllowed("https://graph.microsoft.com/v1.0/me/calendar/events", whitelist)).toBe(
      true,
    );
  });

  test("rejects when whitelist is empty", () => {
    expect(isUrlAllowed("https://anything.com/path", [])).toBe(false);
  });

  test("matches URL with http scheme", () => {
    expect(isUrlAllowed("http://googleapis.com/calendar/v3/events", ["googleapis.com"])).toBe(true);
  });

  test("rejects subdomain mismatch", () => {
    expect(isUrlAllowed("https://sub.googleapis.com/path", ["googleapis.com"])).toBe(false);
  });

  test("returns false for invalid URL", () => {
    expect(isUrlAllowed("not-a-url", ["googleapis.com"])).toBe(false);
  });
});

describe("createProxy (live server)", () => {
  test("returns 400 for missing x-assurgent-upstream header", async () => {
    const proxy = createProxy({ port: 0, bypassWhitelist: true }, {});
    try {
      const res = await fetch(`http://127.0.0.1:${proxy.port}/some-path`);
      expect(res.status).toBe(400);
      const json = (await res.json()) as { error: string; hint: string };
      expect(json.error).toBe("Missing x-assurgent-upstream header");
      expect(json.hint).toContain("x-assurgent-upstream");
    } finally {
      proxy.stop();
    }
  });

  test("returns 400 for duplicate x-assurgent-upstream header", async () => {
    const proxy = createProxy({ port: 0, bypassWhitelist: true }, {});
    try {
      const res = await fetch(`http://127.0.0.1:${proxy.port}/path`, {
        headers: {
          "x-assurgent-upstream": "https://a.com, https://b.com",
        },
      });
      expect(res.status).toBe(400);
      const json = (await res.json()) as { error: string };
      expect(json.error).toContain("Duplicate");
    } finally {
      proxy.stop();
    }
  });

  test("returns 403 for URLs not in whitelist", async () => {
    const proxy = createProxy({ port: 0, whitelist: ["allowed.com"] }, {});
    try {
      const res = await fetch(`http://127.0.0.1:${proxy.port}/path`, {
        headers: { "x-assurgent-upstream": "https://blocked.com" },
      });
      expect(res.status).toBe(403);
      const json = (await res.json()) as { error: string };
      expect(json.error).toContain("not in whitelist");
    } finally {
      proxy.stop();
    }
  });

  test("returns 500 for unknown secretRef in request", async () => {
    const proxy = createProxy({ port: 0, bypassWhitelist: true }, {});
    try {
      const res = await fetch(`http://127.0.0.1:${proxy.port}/test`, {
        headers: {
          "x-assurgent-upstream": "https://example.com",
          Authorization: "Bearer ${{secretRef.unknown}}",
        },
      });
      expect(res.status).toBe(500);
      const json = (await res.json()) as { error: string };
      expect(json.error).toContain("Unknown secretRef");
    } finally {
      proxy.stop();
    }
  });

  test("can be created with bypassWhitelist", () => {
    const proxy = createProxy({ port: 0, bypassWhitelist: true }, { token: "secret-value" });
    expect(proxy.port).toBeGreaterThan(0);
    proxy.stop();
  });
});
