import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import type { getDatabase } from "../lib/neon/database";
import { isDocumentId } from "../lib/workspace/storage-policy";
import { applications, documents, storageCleanup } from "../src/db/schema";

export type WorkspaceTransaction = Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0];
export type ErrorCode = "unavailable" | "conflict" | "quota" | "invalid";
export class WorkspaceError extends Error {
  constructor(public readonly code: ErrorCode) {
    super(code);
  }
}

export const DAY = 24 * 60 * 60 * 1000;
export const RESERVATION_LIFETIME = DAY;
const STAGING_CLEANUP_DELAY = DAY;
export const newExpiry = (now: Date) => new Date(now.getTime() + 90 * DAY);
export const ownedDraft = (ownerId: string, id: string) =>
  and(eq(applications.id, id), eq(applications.ownerId, ownerId));

export const validId = isDocumentId;

export async function lockApplication(tx: WorkspaceTransaction, ownerId: string, id: string) {
  if (!validId(id)) throw new WorkspaceError("unavailable");
  const [row] = await tx.select().from(applications).where(ownedDraft(ownerId, id)).for("update");
  if (!row || row.expiresAt.getTime() <= Date.now()) throw new WorkspaceError("unavailable");
  return row;
}

export async function enqueueCleanup(
  tx: WorkspaceTransaction, ids: string[], kinds: ("staging" | "final")[],
) {
  if (ids.length === 0) return;
  const now = Date.now();
  await tx.insert(storageCleanup).values(ids.flatMap(documentId => kinds.map(kind => ({
    documentId, kind,
    // A previously issued upload URL can still finish writing after draft deletion.
    dueAt: new Date(kind === "staging" ? now + STAGING_CLEANUP_DELAY : now),
  })))).onConflictDoNothing();
}

// The caller holds the draft's exclusive row lock. All child writers use the same lock order.
export async function discardApplication(tx: WorkspaceTransaction, ownerId: string, id: string) {
  const rows = await tx.select({ id: documents.id }).from(documents)
    .where(and(eq(documents.applicationId, id), eq(documents.ownerId, ownerId)));
  await enqueueCleanup(tx, rows.map(row => row.id), ["staging", "final"]);
  await tx.delete(applications).where(ownedDraft(ownerId, id));
}

export async function discardDocuments(
  tx: WorkspaceTransaction, ownerId: string, draftId: string, ids: string[],
) {
  if (!ids.length) return;
  const removed = await tx.delete(documents).where(and(eq(documents.applicationId, draftId),
    eq(documents.ownerId, ownerId), inArray(documents.id, ids))).returning({ id: documents.id });
  await enqueueCleanup(tx, removed.map(row => row.id), ["staging", "final"]);
}
