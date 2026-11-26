import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL_UNPOOLED && !process.env.DATABASE_URL) {
  config({ path: [".env.local", ".env"], quiet: true });
}

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: url ? { url } : undefined,
  schemaFilter: ["public"],
  // The Realtime probe table is managed by the SQL migration in migrations/.
  tablesFilter: ["!lexvia_realtime_probes"],
});
