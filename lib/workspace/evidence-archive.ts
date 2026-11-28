import "server-only";
import { Readable } from "node:stream";
import { ZipFile } from "yazl";
import { EVIDENCE_LABELS } from "./model";
import { documentMedia, validFileSize, type DocumentRole } from "./storage-policy";

export interface ExportFile {
  id: string;
  name: string;
  role: DocumentRole;
  originalId: string | null;
  originalName: string | null;
  evidenceKey: string;
  size: number;
}

const englishLabels: Record<string, string> = {
  passport: "Passport biodata page", trip: "Travel plans", finances: "Travel funds",
  return: "Return arrangements", history: "Travel history", invitation: "Invitation letter",
  support: "Financial support",
};

export function evidenceArchiveIndex(files: ExportFile[]) {
  const groups = new Map<string, ExportFile[]>();
  for (const file of files) {
    const id = file.originalId ?? file.id;
    const group = groups.get(id) ?? [];
    group.push(file);
    groups.set(id, group);
  }
  const entries: { file: ExportFile; path: string }[] = [];
  const lines = ["VBER 材料目录 / Evidence index", "", "压缩包文件名 / Archive filename    上传时的文件名 / Uploaded filename"];
  for (const [index, group] of Array.from(groups.values()).entries()) {
    const number = String(index + 1).padStart(2, "0");
    const { evidenceKey } = group[0];
    lines.push("", `${number} · ${EVIDENCE_LABELS[evidenceKey] ?? evidenceKey} / ${englishLabels[evidenceKey] ?? evidenceKey}`);
    const original = group.find(file => file.role === "original");
    const translations = group.filter(file => file.role === "translation");
    if (!original) lines.push(`原件未勾选 / Original not selected    ${group[0].originalName ?? ""}`);
    for (const file of original ? [original, ...translations] : translations) {
      const media = documentMedia(file.name);
      if (!media || !validFileSize(file.size)) throw new Error("Invalid archive entry");
      const extension = media === "image/jpeg" ? "jpg" : media.split("/")[1];
      const role = file.role === "original" ? "original" : `translation-${translations.indexOf(file) + 1}`;
      const path = `${number}-${role}.${extension}`;
      entries.push({ file, path });
      lines.push(`${file.role === "original" ? "原件 / Original" : "英文译本 / English translation"}    ${path}    ${file.name}`);
    }
  }
  return { entries, index: "\uFEFF" + lines.join("\r\n") + "\r\n" };
}

type OpenFile = (file: ExportFile, signal: AbortSignal) => Promise<Response>;

async function* fileChunks(file: ExportFile, open: OpenFile, signal: AbortSignal) {
  signal.throwIfAborted();
  const response = await open(file, signal);
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error("Evidence unavailable");
  }
  const reader = response.body.getReader();
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > file.size) throw new Error("Evidence size mismatch");
      yield value;
    }
    if (size !== file.size) throw new Error("Incomplete evidence");
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}

export function createEvidenceArchive(files: ExportFile[], open: OpenFile, signal: AbortSignal) {
  const { entries, index } = evidenceArchiveIndex(files);
  const zip = new ZipFile();
  const body = zip.outputStream as Readable;
  zip.on("error", error => body.destroy(error));
  zip.addBuffer(Buffer.from(index), "index.txt", { compress: false });
  for (const { file, path } of entries) {
    zip.addReadStreamLazy(path, { compress: false, size: file.size }, ready => {
      const source = Readable.from(fileChunks(file, open, signal), { objectMode: false });
      source.on("error", error => body.destroy(error));
      ready(null, source);
    });
  }
  // With stored entries and known input sizes, yazl calculates the exact length synchronously.
  let size = 0;
  zip.end(undefined, (calculated?: number) => { size = calculated ?? 0; });
  if (size <= 0) throw new Error("Archive length unavailable");
  return { body, size };
}
