import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL_UNPOOLED && !process.env.DATABASE_URL) {
  config({ path: [".env.local", ".env"], quiet: true });
}

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

export default defineConfig({
  out: "./migrations",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: url ? { url } : undefined,
  schemaFilter: ["public"],
  tablesFilter: [
    "users", "lexvia_realtime_probes", "applications", "applicant_details",
    "evidence_items", "documents", "storage_cleanup", "assistant_usage",
  ],
});
