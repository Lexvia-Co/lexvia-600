import { documentMedia, validFileName, validFileSize } from "@/lib/workspace/storage-policy";

export type FileQueueState = "empty" | "pending" | "uploading" | "updating";
type EntryState = "ready" | "uploading" | "failed" | "rejected";

export type QueuedFile = {
  file: File;
  requestId: string;
  original: { id: string; name: string } | null;
  state: EntryState;
  message: string;
};

function selectionError(file: File) {
  if (file.size === 0) return "文件是空的。请重新导出或选择有内容的文件。";
  if (!validFileSize(file.size)) return "文件超过 10 MiB。请压缩文件，再选择压缩后的版本。";
  if (!documentMedia(file.name)) return "请选择 PDF、JPEG 或 PNG 格式的文件。";
  if (!validFileName(file.name)) return "请缩短文件名，去掉特殊符号，再选择文件。";
  return "";
}

export function queueFiles(files: File[], original: QueuedFile["original"]): QueuedFile[] {
  return files.map(file => {
    const message = selectionError(file);
    return { file, original, requestId: crypto.randomUUID(), state: message ? "rejected" : "ready", message };
  });
}

type UploadResult = { ok: true } | { ok: false; retryable: boolean; message: string };

export async function uploadQueuedFiles(
  entries: QueuedFile[],
  uploadOne: (entry: QueuedFile) => Promise<UploadResult>,
  report: (requestId: string, state: EntryState | "saved", message: string) => void,
) {
  let saved = 0;
  let failed = 0;
  for (const entry of entries) {
    if (entry.state !== "ready" && entry.state !== "failed") continue;
    report(entry.requestId, "uploading", "");
    try {
      const result = await uploadOne(entry);
      if (result.ok) {
        report(entry.requestId, "saved", "");
        saved += 1;
      } else {
        report(entry.requestId, result.retryable ? "failed" : "rejected", result.message);
        failed += 1;
      }
    } catch {
      report(entry.requestId, "failed", "没能确认上传结果。请检查网络，再重试这个文件。");
      failed += 1;
    }
  }
  return { saved, failed };
}
