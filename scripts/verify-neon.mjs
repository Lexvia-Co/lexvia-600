import { randomUUID } from "node:crypto";
import { checkDatabase, checkRealtime } from "../data/diagnostics.ts";
import { checkAI, checkFunction, checkStorage, embeddingModel } from "../lib/neon/services.mjs";

const services = {
  postgres: checkDatabase,
  "ai-gateway": checkAI,
  "object-storage": checkStorage,
  functions: checkFunction,
  realtime: checkRealtime,
};

// Driver and upstream error messages can include connection URLs or credentials.
function failureDetail(error) {
  const message = error instanceof Error ? error.message : "";
  const missing = /^Missing [A-Z][A-Z0-9_]*$/.exec(message);
  const status = /\bHTTP ([45]\d{2})\b/.exec(message);
  return missing?.[0] ?? status?.[0] ?? "Service check failed";
}

async function reportAIRestriction() {
  const catalog = await fetch(new URL("/v1/models", process.env.NEON_AI_GATEWAY_BASE_URL), {
    headers: { Authorization: `Bearer ${process.env.NEON_AI_GATEWAY_TOKEN}` },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  console.log(`AI Gateway model catalog: HTTP ${catalog.status}`);
  if (!catalog.ok) return;

  const { data } = await catalog.json();
  const enabled = data.filter(model => model.enabled);
  const reason = data.find(model => model.id === embeddingModel)?.unavailable_reason;
  console.log(`AI Gateway models enabled: ${enabled.length}/${data.length}`);
  if (typeof reason === "string" && /^[a-z_]{1,80}$/.test(reason)) {
    console.log(`AI Gateway embedding model restriction: ${reason}`);
  }
}

const runId = randomUUID();
console.log(`Checking Neon services (run ${runId})`);
const checks = await Promise.all(Object.entries(services).map(async ([service, check]) => {
  try {
    return { service, ok: true, detail: await check(runId) };
  } catch (error) {
    return { service, ok: false, detail: failureDetail(error) };
  }
}));
for (const { service, ok, detail } of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${service} — ${detail}`);
}
if (checks.some(check => !check.ok)) process.exitCode = 1;

if (checks.some(check => check.service === "ai-gateway" && check.detail === "HTTP 403")) {
  try {
    await reportAIRestriction();
  } catch (error) {
    console.error(`AI Gateway model catalog: ${failureDetail(error)}`);
  }
}
