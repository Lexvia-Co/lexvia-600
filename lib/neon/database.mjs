import { randomUUID } from "node:crypto";
import { createRealtime, rawSql } from "@neon/realtime/server";
import { Pool } from "pg";

const realtimeTimeoutMs = 20_000;
let pool;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: requiredEnv("DATABASE_URL"),
      max: 4,
      connectionTimeoutMillis: 10_000,
      query_timeout: 15_000,
      allowExitOnIdle: true,
    });
    pool.on("error", (error) => {
      console.error("Idle Neon Postgres connection failed", error.code ?? error.name);
    });
  }
  return pool;
}

/** @param {string} runId */
export async function checkDatabase(runId) {
  const result = await getPool().query(
    "SELECT current_database() AS database, $1::text AS marker",
    [runId],
  );
  const row = result.rows[0];
  if (row?.marker !== runId) throw new Error("Postgres returned an unexpected marker");
  return `Postgres database ${row.database} returned marker ${runId}.`;
}

/** @param {string} runId */
export async function checkRealtime(runId) {
  const id = randomUUID();
  const db = getPool();
  const databaseName = decodeURIComponent(new URL(requiredEnv("DATABASE_URL")).pathname.slice(1));
  const realtime = createRealtime({
    db: databaseName,
    url: requiredEnv("NEON_REALTIME_URL"),
    secret: requiredEnv("NEON_REALTIME_SECRET"),
  });
  try {
    const query = rawSql(
      "SELECT id, marker FROM public.lexvia_realtime_probes WHERE id = $1::uuid",
      [id],
    );
    const subscription = await realtime.subscribe(query);
    await subscription.awaitRows((rows) => rows.length === 0, realtimeTimeoutMs);
    try {
      const inserted = await db.query(
        `INSERT INTO public.lexvia_realtime_probes (id, marker) VALUES ($1, $2)
         RETURNING pg_current_xact_id()::text AS txid`,
        [id, runId],
      );
      const { txid } = inserted.rows[0];
      await subscription.awaitTxId(txid, realtimeTimeoutMs);
      const received = subscription.getSnapshot().data?.some(
        (row) => row.id === id && row.marker === runId,
      );
      if (!received) throw new Error("Realtime did not deliver the committed marker");
      return `WebSocket delivered marker ${runId} from Postgres transaction ${txid}.`;
    } finally {
      await db.query(
        "DELETE FROM public.lexvia_realtime_probes WHERE id = $1 AND marker = $2",
        [id, runId],
      );
    }
  } finally {
    realtime.close();
  }
}
