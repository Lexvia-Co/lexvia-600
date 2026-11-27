import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";

export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");
  return url;
}

function connect() {
  const db = drizzle({
    connection: {
      connectionString: getDatabaseUrl(),
      max: 4,
      connectionTimeoutMillis: 10_000,
      query_timeout: 15_000,
      allowExitOnIdle: true,
    },
  });
  db.$client.on("error", (error: NodeJS.ErrnoException) => {
    console.error("Idle Neon Postgres connection failed", error.code ?? error.name);
  });
  return db;
}

let database: ReturnType<typeof connect> | undefined;

export function getDatabase() {
  return database ??= connect();
}
