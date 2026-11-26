import { parseTriggerDelivery } from "@neon/functions/triggers";
import { runStorageCleanup } from "../data/documents";
import { removeObject } from "../lib/workspace/storage";

export default async function cleanup(request: Request): Promise<Response> {
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });
  // Neon strips caller-supplied trigger headers at its Functions proxy.
  const delivery = await parseTriggerDelivery(request);
  if (!delivery.ok || delivery.invocation.type !== "schedule"
    || delivery.invocation.trigger.name !== "workspace-retention") return new Response(null, { status: 403 });
  try {
    const result = await runStorageCleanup(removeObject, 20);
    console.info("workspace.cleanup", { ...result, failure: result.failed ? "object_delete" : null });
    return Response.json(result, { status: result.failed ? 503 : 200 });
  } catch {
    console.error("workspace.cleanup", { failure: "worker_or_database" });
    return new Response(null, { status: 503 });
  }
}
