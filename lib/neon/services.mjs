import { createHash, randomUUID } from "node:crypto";
import { functionBaseUrl } from "@neon/env";
import { AwsClient } from "aws4fetch";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function checkStatus(response, operation) {
  if (!response.ok) {
    throw new Error(`${operation} returned HTTP ${response.status}`);
  }
  return response;
}

export async function checkAI(runId) {
  const model = "qwen3-embedding-0-6b";
  const dimensions = 256;
  const url = new URL("/v1/embeddings", requiredEnv("NEON_AI_GATEWAY_BASE_URL"));
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnv("NEON_AI_GATEWAY_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: `Service check ${runId.slice(0, 8)}`,
      encoding_format: "float",
      dimensions,
    }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  checkStatus(response, "AI inference");
  const result = await response.json();
  const vector = result.data?.[0]?.embedding;
  if (
    !Array.isArray(vector) ||
    vector.length !== dimensions ||
    !vector.every(Number.isFinite) ||
    !vector.some(value => value !== 0)
  ) {
    throw new Error("The model returned an invalid embedding");
  }
  return `${model} returned a ${dimensions}-dimensional embedding`;
}

export async function checkStorage(runId) {
  const client = new AwsClient({
    accessKeyId: requiredEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("AWS_SECRET_ACCESS_KEY"),
    region: requiredEnv("AWS_REGION"),
    service: "s3",
    retries: 1,
  });
  const key = `service-checks/${randomUUID()}.txt`;
  const url = new URL(`/assets/${key}`, requiredEnv("AWS_ENDPOINT_URL_S3"));
  const content = `Neon storage check ${runId}`;
  async function send(method, body) {
    const response = await client.fetch(url, {
      method,
      body,
      headers: {
        "x-amz-content-sha256": createHash("sha256").update(body ?? "").digest("hex"),
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    return checkStatus(response, `Object Storage ${method}`);
  }
  try {
    await send("PUT", content);
    const object = await send("GET");
    if ((await object.text()) !== content) {
      throw new Error("The downloaded object did not match the uploaded content");
    }
  } finally {
    await send("DELETE");
  }
  return `assets: wrote, read, and deleted ${Buffer.byteLength(content)} bytes`;
}

export async function checkFunction(runId) {
  const url = new URL(functionBaseUrl("hello"));
  url.searchParams.set("runId", runId);
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  checkStatus(response, "Neon Function hello");
  const greeting = (await response.text()).trim();
  if (greeting !== "Hello from Neon Functions") {
    throw new Error("The hello function returned an unexpected response");
  }
  return `hello returned HTTP ${response.status} and "${greeting}"`;
}
