import "server-only";
import { and, asc, eq, lte } from "drizzle-orm";
import { getDatabase } from "../lib/neon/database";
import { EVIDENCE_LABELS } from "../lib/workspace/model";
import type { FileInspection } from "../lib/workspace/document-checks";
import { documentMedia, validEvidenceChange, validFileName, validFileSize, type EvidenceDetailsChange } from "../lib/workspace/storage-policy";
import { applications, documents, storageCleanup } from "../src/db/schema";
import {
  discardApplication, discardDocuments, enqueueCleanup, lockApplication, newExpiry, ownedDraft,
  RESERVATION_LIFETIME, validId, WorkspaceError, type WorkspaceTransaction,
} from "./workspace-state";

export interface UploadInput {
  id: string;
  evidenceKey: string;
  kind: "original" | "translation";
  originalId?: string | null;
  fileName: string;
  size: number;
  mediaType: string;
}

const uploadFields = {
  id: documents.id, evidenceKey: documents.evidenceKey, kind: documents.kind, originalId: documents.originalId, fileName: documents.fileName,
  size: documents.size, mediaType: documents.mediaType, state: documents.state, createdAt: documents.createdAt,
  language: documents.language, intendedUse: documents.intendedUse, fileInspection: documents.fileInspection,
  referenceOnly: documents.referenceOnly,
};
export type UploadRecord = Pick<typeof documents.$inferSelect, keyof typeof uploadFields>;
const MIB = 1024 * 1024;
const fileScope = (ownerId: string, draftId: string) =>
  and(eq(documents.ownerId, ownerId), eq(documents.applicationId, draftId));
const recordScope = (ownerId: string, draftId: string, id: string) =>
  and(fileScope(ownerId, draftId), eq(documents.id, id));
const expired = (createdAt: Date) => createdAt.getTime() + RESERVATION_LIFETIME <= Date.now();

async function refreshExpiry(tx: WorkspaceTransaction, ownerId: string, draftId: string) {
  const now = new Date();
  await tx.update(applications).set({ updatedAt: now, expiresAt: newExpiry(now) }).where(ownedDraft(ownerId, draftId));
}

export async function reserveUpload(ownerId: string, draftId: string, input: UploadInput) {
  if (!validId(input.id) || !validFileSize(input.size) || !validFileName(input.fileName) ||
      documentMedia(input.fileName) !== input.mediaType || !Object.hasOwn(EVIDENCE_LABELS, input.evidenceKey) ||
      !["original", "translation"].includes(input.kind) ||
      (input.kind === "translation" ? !validId(input.originalId) : input.originalId != null)) {
    throw new WorkspaceError("invalid");
  }
  return getDatabase().transaction(async tx => {
    await lockApplication(tx, ownerId, draftId);
    const rows = await tx.select({ ...uploadFields, requestId: documents.requestId }).from(documents)
      .where(fileScope(ownerId, draftId));
    const stale = rows.filter(row => row.state === "pending" && expired(row.createdAt));
    await discardDocuments(tx, ownerId, draftId, stale.map(row => row.id));
    const active = rows.filter(row => !stale.includes(row));
    const existing = active.find(row => row.requestId === input.id);
    if (existing) {
      if (existing.evidenceKey !== input.evidenceKey || existing.kind !== input.kind || existing.originalId !== (input.originalId ?? null) ||
          existing.fileName !== input.fileName || existing.mediaType !== input.mediaType || existing.size !== input.size) {
        throw new WorkspaceError("conflict");
      }
      return { id: existing.id, state: existing.state, createdAt: existing.createdAt };
    }
    if (input.kind === "translation" && !active.some(row => row.id === input.originalId &&
        row.kind === "original" && row.state === "ready" && row.evidenceKey === input.evidenceKey)) {
      throw new WorkspaceError("unavailable");
    }
    const reservedBytes = active.reduce((sum, row) => sum + row.size, 0);
    if (active.length >= 40 || reservedBytes + input.size > 100 * MIB) throw new WorkspaceError("quota");
    const [row] = await tx.insert(documents).values({
      ownerId, applicationId: draftId, requestId: input.id, evidenceKey: input.evidenceKey,
      kind: input.kind, originalId: input.originalId ?? null, fileName: input.fileName, size: input.size, mediaType: input.mediaType,
    }).returning({ id: documents.id, state: documents.state, createdAt: documents.createdAt });
    return row;
  });
}

export async function readUpload(ownerId: string, draftId: string, documentId: string): Promise<(UploadRecord & { expiresAt: Date }) | null> {
  if (!validId(draftId) || !validId(documentId)) return null;
  const [row] = await getDatabase().select({ ...uploadFields, expiresAt: applications.expiresAt })
    .from(documents).innerJoin(applications, eq(documents.applicationId, applications.id))
    .where(and(ownedDraft(ownerId, draftId), recordScope(ownerId, draftId, documentId)));
  if (!row || (row.state === "pending" && expired(row.createdAt))) return null;
  return row.expiresAt.getTime() > Date.now() ? row : null;
}

export async function finalizeUpload(
  ownerId: string, draftId: string, documentId: string, verifyAndWrite: (record: UploadRecord) => Promise<FileInspection>,
) {
  if (!validId(documentId)) throw new WorkspaceError("unavailable");
  await getDatabase().transaction(async tx => {
    const draft = await lockApplication(tx, ownerId, draftId);
    const scope = recordScope(ownerId, draftId, documentId);
    const [row] = await tx.select(uploadFields).from(documents).where(scope);
    if (!row) throw new WorkspaceError("unavailable");
    if (row.state === "ready") return;
    if (expired(row.createdAt)) throw new WorkspaceError("unavailable");
    // The callback promotes verified bytes under the deterministic, private final key.
    // Another attempt can safely repeat the write if this transaction does not commit.
    const fileInspection = await verifyAndWrite(row);
    if (draft.expiresAt.getTime() <= Date.now() || expired(row.createdAt)) throw new WorkspaceError("unavailable");
    await tx.update(documents).set({ state: "ready", fileInspection }).where(scope);
    await enqueueCleanup(tx, [documentId], ["staging"]);
    await refreshExpiry(tx, ownerId, draftId);
  });
}

export async function updateDocumentDetails(ownerId: string, draftId: string, documentId: string, change: EvidenceDetailsChange) {
  if (!validId(documentId) || !validEvidenceChange(change)) throw new WorkspaceError("invalid");
  await getDatabase().transaction(async tx => {
    await lockApplication(tx, ownerId, draftId);
    const scope = and(recordScope(ownerId, draftId, documentId), eq(documents.state, "ready"));
    const [row] = await tx.select({ kind: documents.kind, mediaType: documents.mediaType }).from(documents).where(scope);
    if (!row) throw new WorkspaceError("unavailable");
    if ("language" in change && row.kind !== "original") throw new WorkspaceError("invalid");
    if ("intendedUse" in change && (row.kind !== "original" || row.mediaType === "application/pdf")) throw new WorkspaceError("invalid");
    await tx.update(documents).set(change).where(scope);
    await refreshExpiry(tx, ownerId, draftId);
  });
}

export async function inspectDocumentFile(
  ownerId: string, draftId: string, documentId: string, inspect: (record: UploadRecord) => Promise<FileInspection>,
) {
  const row = await readUpload(ownerId, draftId, documentId);
  if (!row || row.state !== "ready") throw new WorkspaceError("unavailable");
  if (row.fileInspection !== "unknown") return;
  // Final objects are immutable. Read outside the transaction and recheck ownership and expiry before saving.
  const fileInspection = await inspect(row);
  await getDatabase().transaction(async tx => {
    await lockApplication(tx, ownerId, draftId);
    const scope = and(recordScope(ownerId, draftId, documentId), eq(documents.state, "ready"));
    const [saved] = await tx.update(documents).set({ fileInspection }).where(scope).returning({ id: documents.id });
    if (!saved) throw new WorkspaceError("unavailable");
    await refreshExpiry(tx, ownerId, draftId);
  });
}

export async function removeDocument(ownerId: string, draftId: string, documentId: string) {
  if (!validId(documentId)) throw new WorkspaceError("unavailable");
  await getDatabase().transaction(async tx => {
    await lockApplication(tx, ownerId, draftId);
    const [row] = await tx.select({ id: documents.id }).from(documents)
      .where(recordScope(ownerId, draftId, documentId));
    if (!row) return;
    const translations = await tx.select({ id: documents.id }).from(documents)
      .where(and(fileScope(ownerId, draftId), eq(documents.originalId, documentId)));
    await discardDocuments(tx, ownerId, draftId, [documentId, ...translations.map(file => file.id)]);
    await refreshExpiry(tx, ownerId, draftId);
  });
}

export async function discardPendingUpload(ownerId: string, draftId: string, documentId: string) {
  if (!validId(documentId)) throw new WorkspaceError("unavailable");
  await getDatabase().transaction(async tx => {
    await lockApplication(tx, ownerId, draftId);
    const [row] = await tx.select({ id: documents.id }).from(documents)
      .where(and(recordScope(ownerId, draftId, documentId), eq(documents.state, "pending")));
    if (row) await discardDocuments(tx, ownerId, draftId, [row.id]);
  });
}

async function expireReservations(limit: number) {
  const db = getDatabase();
  const expiredDrafts = await db.transaction(async tx => {
    const drafts = await tx.select({ id: applications.id, ownerId: applications.ownerId }).from(applications)
      .where(lte(applications.expiresAt, new Date())).orderBy(asc(applications.expiresAt))
      .limit(limit).for("update", { skipLocked: true });
    for (const draft of drafts) await discardApplication(tx, draft.ownerId, draft.id);
    return drafts.length;
  });
  const cutoff = new Date(Date.now() - RESERVATION_LIFETIME);
  const pending = await db.select({ id: documents.id, draftId: documents.applicationId, ownerId: documents.ownerId })
    .from(documents).where(and(eq(documents.state, "pending"), lte(documents.createdAt, cutoff)))
    .orderBy(asc(documents.createdAt)).limit(limit);
  let abandonedUploads = 0;
  for (const row of pending) {
    const discarded = await db.transaction(async tx => {
      const [draft] = await tx.select({ id: applications.id }).from(applications)
        .where(ownedDraft(row.ownerId, row.draftId)).for("update", { skipLocked: true });
      if (!draft) return false;
      const [stale] = await tx.select({ id: documents.id }).from(documents)
        .where(and(recordScope(row.ownerId, row.draftId, row.id), eq(documents.state, "pending"), lte(documents.createdAt, cutoff)));
      if (!stale) return false;
      await discardDocuments(tx, row.ownerId, row.draftId, [stale.id]);
      return true;
    });
    if (discarded) abandonedUploads++;
  }
  return { expiredDrafts, abandonedUploads };
}

export async function runStorageCleanup(remove: (id: string, kind: "staging" | "final") => Promise<void>, limit = 100) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new WorkspaceError("invalid");
  const counts = await expireReservations(limit);
  let processed = 0;
  let failed = 0;
  for (let count = 0; count < limit; count++) {
    const result = await getDatabase().transaction(async tx => {
      const [job] = await tx.select().from(storageCleanup).where(lte(storageCleanup.dueAt, new Date()))
        .orderBy(asc(storageCleanup.dueAt)).limit(1).for("update", { skipLocked: true });
      if (!job) return "empty";
      const target = and(eq(storageCleanup.documentId, job.documentId), eq(storageCleanup.kind, job.kind));
      try {
        await remove(job.documentId, job.kind);
      } catch {
        await tx.update(storageCleanup).set({ attempts: job.attempts + 1,
          dueAt: new Date(Date.now() + Math.min(60, 2 ** Math.min(job.attempts, 6)) * 60_000) }).where(target);
        return "failed";
      }
      await tx.delete(storageCleanup).where(target);
      return "removed";
    });
    if (result === "empty") break;
    if (result === "failed") failed++;
    else processed++;
  }
  return { ...counts, processed, failed };
}
