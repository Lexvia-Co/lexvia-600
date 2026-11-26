import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { checkDatabase, checkRealtime } from "@/lib/neon/database.mjs";
import { checkAI, checkFunction, checkStorage } from "@/lib/neon/services.mjs";

const services = {
  postgres: checkDatabase,
  "ai-gateway": checkAI,
  "object-storage": checkStorage,
  functions: checkFunction,
  realtime: checkRealtime,
};

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export async function POST(request: Request) {
  const token = process.env.NEON_CHECK_TOKEN;
  const suppliedToken = request.headers.get("x-neon-check-token") ?? "";
  if (!token || !timingSafeEqual(digest(suppliedToken), digest(token))) {
    return new Response(null, { status: 404 });
  }

  const runId = randomUUID();
  const checks = await Promise.all(Object.entries(services).map(async ([service, run]) => {
    try {
      return { service, ok: true, detail: await run(runId) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      // Return environment variable names and HTTP status codes, never upstream bodies or URLs.
      const missing = /^Missing [A-Z][A-Z0-9_]*$/.exec(message);
      const status = /\bHTTP ([45]\d{2})\b/.exec(message);
      const detail = missing?.[0] ?? status?.[0] ?? "Service check failed";
      return { service, ok: false, detail };
    }
  }));
  return Response.json({ runId, checks }, {
    status: checks.every(check => check.ok) ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
