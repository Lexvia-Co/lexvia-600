import {
  index, integer, jsonb, pgTable, primaryKey, text, timestamp, unique, uuid, varchar,
} from "drizzle-orm/pg-core";
import type { Answers, Step, TemplateKind } from "../../lib/workspace/model";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});

export const realtimeProbes = pgTable("lexvia_realtime_probes", {
  id: uuid().primaryKey(),
  marker: text().notNull(),
});

export type SavedTemplate = { body: string; fingerprint: string };
const time = (name: string) => timestamp(name, { withTimezone: true });

export const applications = pgTable("applications", {
  id: uuid().primaryKey().defaultRandom(),
  ownerId: text("owner_id").notNull(),
  guideVersion: text("guide_version").notNull(),
  lastStep: text("last_step").$type<Step>().notNull().default("identity"),
  revision: integer().notNull().default(1),
  templates: jsonb().$type<Partial<Record<TemplateKind, SavedTemplate>>>().notNull().default({}),
  createdAt: time("created_at").notNull().defaultNow(),
  updatedAt: time("updated_at").notNull().defaultNow(),
  expiresAt: time("expires_at").notNull(),
}, table => [
  index("applications_owner_idx").on(table.ownerId, table.updatedAt),
  index("applications_expiry_idx").on(table.expiresAt),
]);

export const applicantDetails = pgTable("applicant_details", {
  applicationId: uuid("application_id").primaryKey().references(() => applications.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull(),
  answers: jsonb().$type<Answers>().notNull(),
});

export const evidenceItems = pgTable("evidence_items", {
  applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull(),
  evidenceKey: text("evidence_key").notNull(),
  note: text().notNull().default(""),
}, table => [primaryKey({ columns: [table.applicationId, table.evidenceKey] })]);

export const documents = pgTable("documents", {
  id: uuid().primaryKey().defaultRandom(),
  requestId: uuid("request_id").notNull(),
  applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull(),
  evidenceKey: text("evidence_key").notNull(),
  kind: text().$type<"original" | "translation">().notNull(),
  originalId: uuid("original_id"),
  fileName: text("file_name").notNull(),
  mediaType: text("media_type").notNull(),
  size: integer().notNull(),
  state: text().$type<"pending" | "ready">().notNull().default("pending"),
  createdAt: time("created_at").notNull().defaultNow(),
}, table => [
  unique("documents_request_id").on(table.applicationId, table.requestId),
  index("documents_state_created_idx").on(table.state, table.createdAt),
]);

// Cleanup outlives a draft. Only opaque object identifiers survive deletion.
export const storageCleanup = pgTable("storage_cleanup", {
  documentId: uuid("document_id").notNull(),
  kind: text().$type<"staging" | "final">().notNull(),
  dueAt: time("due_at").notNull(),
  attempts: integer().notNull().default(0),
}, table => [
  primaryKey({ columns: [table.documentId, table.kind] }),
  index("storage_cleanup_due_idx").on(table.dueAt),
]);
