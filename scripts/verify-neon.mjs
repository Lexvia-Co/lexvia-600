import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import next from "next";

// Only this process and its test client need access to the diagnostic endpoint.
const token = randomBytes(32).toString("hex");
process.env.NEON_CHECK_TOKEN = token;
const hostname = "localhost";
const server = createServer();
let app;

try {
  server.listen(0, hostname);
  await once(server, "listening");
  const { port } = server.address();
  app = next({ dev: false, dir: process.cwd(), hostname, port });
  await app.prepare();
  server.on("request", app.getRequestHandler());
  const url = `http://${hostname}:${port}/api/neon/check`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "X-Neon-Check-Token": token },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(`Expected a JSON response from the running app (HTTP ${response.status}).`);
  }
  const { runId, checks } = await response.json();
  console.log(`POST /api/neon/check → HTTP ${response.status} (run ${runId})`);
  for (const { service, ok, detail } of checks) {
    console.log(`${ok ? "PASS" : "FAIL"} ${service} — ${detail}`);
  }
  if (checks.some(check => check.service === "ai-gateway" && check.detail === "HTTP 403")) {
    const catalog = await fetch(new URL("/v1/models", process.env.NEON_AI_GATEWAY_BASE_URL), {
      headers: { Authorization: `Bearer ${process.env.NEON_AI_GATEWAY_TOKEN}` },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    console.log(`AI Gateway model catalog: HTTP ${catalog.status}`);
    if (catalog.ok) {
      const { data } = await catalog.json();
      const enabled = data.filter(model => model.enabled);
      const target = data.find(model => model.id === "qwen3-embedding-0-6b");
      const reason = target?.unavailable_reason;
      console.log(`AI Gateway models enabled: ${enabled.length}/${data.length}`);
      if (typeof reason === "string" && /^[a-z_]{1,80}$/.test(reason)) {
        console.log(`AI Gateway embedding model restriction: ${reason}`);
      }
    }
  }
  if (!response.ok || checks.length !== 5 || checks.some(check => !check.ok)) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (server.listening) {
    await new Promise(resolve => server.close(resolve));
  }
  await app?.close();
}
