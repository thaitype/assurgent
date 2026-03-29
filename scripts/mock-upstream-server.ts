const server = Bun.serve({
  port: 3000,

  fetch(req) {
    const url = new URL(req.url);

    // Log request headers
    console.log(`\n--- ${req.method} ${url.pathname} ---`);
    console.log("📥 Request Headers:");
    for (const [key, value] of req.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    // Build response
    const body = JSON.stringify({
      message: "Hello from Bun!",
      path: url.pathname,
      timestamp: new Date().toISOString(),
    });

    const response = new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Powered-By": "Bun",
        "X-Request-Id": crypto.randomUUID(),
      },
    });

    // Log response headers
    console.log("📤 Response Headers:");
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    console.log(`✅ Status: ${response.status}\n`);

    return response;
  },
});

console.log(`🚀 Server running at http://localhost:${server.port}`);
