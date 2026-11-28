import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, gt, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDatabase } from "../lib/neon/database";
import { isDocumentId } from "../lib/workspace/storage-policy";
import { applications, documents, storageCleanup } from "../src/db/schema";
import { ownedDraft, WorkspaceError } from "./workspace-state";

export async function readExportSelection(ownerId: string, draftId: string, ids: string[]) {
  if (!isDocumentId(draftId) || !Array.isArray(ids) || !ids.length || ids.length > 40
    || !ids.every(isDocumentId) || new Set(ids).size !== ids.length) throw new WorkspaceError("invalid");
  const original = alias(documents, "export_original");
  const files = await getDatabase().select({
    id: documents.id, name: documents.fileName, role: documents.kind, size: documents.size,
    originalId: documents.originalId, originalName: original.fileName, evidenceKey: documents.evidenceKey,
    expiresAt: applications.expiresAt,
  }).from(documents).innerJoin(applications, eq(documents.applicationId, applications.id))
    .leftJoin(original, and(eq(original.id, documents.originalId), eq(original.ownerId, documents.ownerId),
      eq(original.applicationId, documents.applicationId), eq(original.state, "ready"), eq(original.kind, "original")))
    .where(and(ownedDraft(ownerId, draftId), gt(applications.expiresAt, new Date()),
      eq(documents.ownerId, ownerId), eq(documents.state, "ready"), inArray(documents.id, ids)));
  if (files.length !== ids.length) throw new WorkspaceError("unavailable");
  const byId = new Map(files.map(file => [file.id, file]));
  return ids.map(id => byId.get(id.toLowerCase())!);
}

export async function reserveEvidenceExport(ownerId: string, draftId: string, ids: string[]) {
  const files = await readExportSelection(ownerId, draftId, ids);
  const archiveId = randomUUID();
  // Commit cleanup before starting any storage write, including writes that may time out.
  await getDatabase().insert(storageCleanup).values({
    documentId: archiveId, kind: "final", dueAt: new Date(Date.now() + 5 * 60_000),
  });
  return { files, archiveId };
}
