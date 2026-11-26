import "server-only";
import { randomUUID } from "node:crypto";
import { createRealtime, encodeTextParameter } from "@neon/realtime/server";
import { and, eq } from "drizzle-orm";
import { getDatabase, getDatabaseUrl } from "../lib/neon/database";
import { realtimeProbes } from "../src/db/schema";

export async function checkDatabase(runId: string) {
  await getDatabase()
    .select({ id: realtimeProbes.id })
    .from(realtimeProbes)
    .where(eq(realtimeProbes.id, runId))
    .limit(1);
  return "Postgres queried the Realtime probe table.";
}

export async function checkRealtime(runId: string) {
  const url = process.env.NEON_REALTIME_URL;
  const secret = process.env.NEON_REALTIME_SECRET;
  if (!url) throw new Error("Missing NEON_REALTIME_URL");
  if (!secret) throw new Error("Missing NEON_REALTIME_SECRET");

  const db = getDatabase();
  const id = randomUUID();
  const query = db.select().from(realtimeProbes).where(eq(realtimeProbes.id, id));
  const realtime = createRealtime<typeof query>({
    db: decodeURIComponent(new URL(getDatabaseUrl()).pathname.slice(1)),
    url,
    secret,
    // The SDK adapter for Drizzle 0.45 does not support this project's Drizzle 1.x.
    adapter: {
      prepare(select) {
        const { sql, params } = select.toSQL();
        return {
          sql,
          parameters: params.map((param) => {
            if (typeof param !== "string") throw new Error("Expected a UUID parameter");
            return encodeTextParameter(param);
          }),
        };
      },
    },
  });

  try {
    const subscription = await realtime.subscribe(query);
    await subscription.awaitRows((rows) => rows.length === 0, 20_000);
    try {
      await db.insert(realtimeProbes).values({ id, marker: runId });
      await subscription.awaitRows(
        (rows) => rows.some((row) => row.id === id && row.marker === runId),
        20_000,
      );
      return `WebSocket delivered the committed marker ${runId}.`;
    } finally {
      await db.delete(realtimeProbes).where(and(eq(realtimeProbes.id, id), eq(realtimeProbes.marker, runId)));
    }
  } finally {
    realtime.close();
  }
}
