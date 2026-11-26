import { readFile } from "node:fs/promises";
import { Client } from "pg";

if (!process.env.DATABASE_URL_UNPOOLED) {
  console.error("Missing DATABASE_URL_UNPOOLED. Pull the Neon branch environment before migrating.");
  process.exitCode = 1;
} else {
  const sql = await readFile(new URL("../migrations/001_neon_realtime_probe.sql", import.meta.url), "utf8");
  const db = new Client({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 15_000,
  });
  try {
    await db.connect();
    await db.query(sql);
    console.log("Ready: public.lexvia_realtime_probes");
  } catch (error) {
    console.error("Neon migration failed", error.code ?? error.name);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}
