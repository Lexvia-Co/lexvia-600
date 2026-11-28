"use server";

import { auth } from "@clerk/nextjs/server";
import { readExportSelection, reserveEvidenceExport } from "@/data/evidence-export";
import { WorkspaceError } from "@/data/workspace-state";
import { publishEvidenceArchive, signDownload } from "@/lib/workspace/storage";
import { DOWNLOAD_URL_SECONDS } from "@/lib/workspace/storage-policy";

export async function exportEvidence(applicationId: string, documentIds: string[]): Promise<
  { ok: true; url: string } | { ok: false; message: string }
> {
  const { userId } = await auth.protect();
  try {
    const { archiveId, files } = await reserveEvidenceExport(userId, applicationId, documentIds);
    await publishEvidenceArchive(archiveId, files);
    // A file or the draft may have been deleted while the archive was being written.
    const [current] = await readExportSelection(userId, applicationId, documentIds);
    const seconds = Math.min(DOWNLOAD_URL_SECONDS, Math.floor((current.expiresAt.getTime() - Date.now()) / 1000));
    if (seconds < 1) throw new WorkspaceError("unavailable");
    return { ok: true, url: await signDownload(archiveId, seconds) };
  } catch (error) {
    if (error instanceof WorkspaceError) return { ok: false, message: "所选文件已变更或无法读取。请刷新草稿，再选择要下载的文件。" };
    return { ok: false, message: "材料包未能生成。请重试下载，你的选择已保留。" };
  }
}
