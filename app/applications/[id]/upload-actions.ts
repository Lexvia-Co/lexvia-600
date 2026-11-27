"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { discardPendingUpload, finalizeUpload, removeDocument, reserveUpload } from "@/data/documents";
import { RESERVATION_LIFETIME, WorkspaceError } from "@/data/workspace-state";
import { EVIDENCE_LABELS } from "@/lib/workspace/model";
import { InvalidUpload, recordFileFailure, signUpload, verifyAndPublish, type FileOperation } from "@/lib/workspace/storage";
import {
  UPLOAD_URL_SECONDS, documentMedia, isDocumentId, validFileName, validFileSize, type UploadInput,
} from "@/lib/workspace/storage-policy";

type ActionFailure = { ok: false; message: string };
type UploadTicket = { ok: true; id: string; url: string | null } | ActionFailure;
type MutationResult = { ok: true } | ActionFailure;

function failure(operation: FileOperation, error: unknown): ActionFailure {
  if (error instanceof InvalidUpload) {
    recordFileFailure(operation, "file_contents");
    return { ok: false, message: "文件的实际格式或大小和上传时不一致。请检查原文件，再选一次。" };
  }
  if (error instanceof WorkspaceError) {
    recordFileFailure(operation, error.code);
    const messages = {
      invalid: "没能识别这个文件。请检查文件名和格式，再选一次。",
      quota: "这份草稿已达到文件数量或容量上限。请先移除不需要的文件。",
      unavailable: "找不到这份草稿或文件。请回到「我的草稿」查看。",
      conflict: "文件信息已更新。请重新选择文件。",
    };
    return { ok: false, message: messages[error.code] };
  }
  recordFileFailure(operation, "service");
  return { ok: false, message: "暂时无法处理文件，请稍后重试。" };
}

function refreshFiles(id: string) {
  revalidatePath(`/applications/${id}/evidence`);
  revalidatePath(`/applications/${id}/review`);
  revalidatePath("/applications");
}

export async function beginEvidenceUpload(applicationId: string, input: UploadInput): Promise<UploadTicket> {
  const { userId } = await auth.protect();
  if (!isDocumentId(applicationId) || !input || !isDocumentId(input.requestId)
    || typeof input.evidenceKey !== "string" || !Object.hasOwn(EVIDENCE_LABELS, input.evidenceKey)
    || !validFileName(input.fileName) || !validFileSize(input.size)
    || (input.role !== "original" && input.role !== "translation")
    || (input.role === "original" ? input.originalId !== null : !isDocumentId(input.originalId))) {
    return failure("reserve", new WorkspaceError("invalid"));
  }
  try {
    const file = await reserveUpload(userId, applicationId, {
      id: input.requestId, evidenceKey: input.evidenceKey, kind: input.role, originalId: input.originalId,
      fileName: input.fileName, size: input.size, mediaType: documentMedia(input.fileName)!,
    });
    const secondsLeft = Math.floor((file.createdAt.getTime() + RESERVATION_LIFETIME - Date.now()) / 1000);
    const url = file.state === "ready" ? null : await signUpload(file.id, input.size, Math.min(secondsLeft, UPLOAD_URL_SECONDS));
    return { ok: true, id: file.id, url };
  } catch (error) {
    return failure("reserve", error);
  }
}

export async function finishEvidenceUpload(applicationId: string, documentId: string): Promise<MutationResult> {
  const { userId } = await auth.protect();
  if (!isDocumentId(applicationId) || !isDocumentId(documentId)) return failure("finalize", new WorkspaceError("invalid"));
  try {
    await finalizeUpload(userId, applicationId, documentId, verifyAndPublish);
    refreshFiles(applicationId);
    return { ok: true };
  } catch (error) {
    if (error instanceof InvalidUpload) {
      try {
        await discardPendingUpload(userId, applicationId, documentId);
      } catch {
        recordFileFailure("discard_pending", "service");
      }
    }
    return failure("finalize", error);
  }
}

export async function deleteEvidenceFile(applicationId: string, documentId: string): Promise<MutationResult> {
  const { userId } = await auth.protect();
  if (!isDocumentId(applicationId) || !isDocumentId(documentId)) return failure("remove", new WorkspaceError("invalid"));
  try {
    await removeDocument(userId, applicationId, documentId);
    refreshFiles(applicationId);
    return { ok: true };
  } catch (error) {
    return failure("remove", error);
  }
}
