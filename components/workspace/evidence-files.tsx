"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { beginEvidenceUpload, deleteEvidenceFile, finishEvidenceUpload } from "@/app/applications/[id]/upload-actions";
import { ACCEPT_DOCUMENTS, type EvidenceFile } from "@/lib/workspace/storage-policy";
import { queueFiles, uploadQueuedFiles, type FileQueueState, type QueuedFile } from "./evidence-upload-queue";

function fileSize(size: number) {
  return size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KiB` : `${(size / 1024 / 1024).toFixed(1)} MiB`;
}

export function EvidenceDownload({ file }: { file: EvidenceFile }) {
  // Ordinary navigation signs at click time. Prefetching would spend the short link lifetime.
  return (
    <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer"
      className="break-all text-primary underline underline-offset-4">
      {file.name}<span className="sr-only">（在新窗口下载）</span>
    </a>
  );
}

export function EvidenceFiles({
  applicationId, evidenceKey, files, onFileQueueChange,
}: {
  applicationId: string; evidenceKey: string; files: EvidenceFile[];
  onFileQueueChange?: (key: string, state: FileQueueState) => void;
}) {
  const router = useRouter();
  const controlId = useId();
  const translationInput = useRef<HTMLInputElement>(null);
  const translationTarget = useRef<QueuedFile["original"]>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [selection, setSelection] = useState<QueuedFile[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const originals = files.filter(file => file.role === "original");
  const uploadable = selection.filter(entry => entry.state === "ready" || entry.state === "failed");
  const queueState: FileQueueState = busy ? "uploading" : selection.some(entry => entry.state !== "rejected") ? "pending" : "empty";

  useEffect(() => {
    onFileQueueChange?.(evidenceKey, queueState);
  }, [evidenceKey, onFileQueueChange, queueState]);
  useEffect(() => () => onFileQueueChange?.(evidenceKey, "empty"), [evidenceKey, onFileQueueChange]);

  function selectFiles(input: HTMLInputElement, original: QueuedFile["original"]) {
    const entries = queueFiles(Array.from(input.files ?? []), original);
    input.value = "";
    if (!entries.length) return;
    setSelection(current => [...current, ...entries]);
    const rejected = entries.filter(entry => entry.state === "rejected").length;
    setNotice(rejected ? `已选择 ${entries.length} 个文件，其中 ${rejected} 个需要更换。` : `已选择 ${entries.length} 个文件，等待上传。`);
  }

  async function uploadOne({ file, requestId, original }: QueuedFile) {
    const ticket = await beginEvidenceUpload(applicationId, {
      fileName: file.name, size: file.size, evidenceKey, requestId,
      role: original ? "translation" : "original", originalId: original?.id ?? null,
    });
    if (!ticket.ok || !ticket.url) return ticket;
    const response = await fetch(ticket.url, {
      method: "PUT", body: file, credentials: "omit", referrerPolicy: "no-referrer", redirect: "error",
    });
    if (!response.ok) return { ok: false as const, retryable: true, message: "这个文件没传完。请重试。" };
    return finishEvidenceUpload(applicationId, ticket.id);
  }

  async function upload(entries: QueuedFile[]) {
    if (busyRef.current || !entries.length) return;
    busyRef.current = true;
    setBusy(true);
    setNotice("正在上传…");
    try {
      const { saved, failed } = await uploadQueuedFiles(entries, uploadOne, (id, state, message) => {
        setSelection(current => state === "saved"
          ? current.filter(entry => entry.requestId !== id)
          : current.map(entry => entry.requestId === id ? { ...entry, state, message } : entry));
      });
      setNotice([saved && `已保存 ${saved} 个文件。`, failed && `${failed} 个文件未上传，请查看文件旁的提示。`].filter(Boolean).join(""));
      if (saved) router.refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function remove(file: EvidenceFile) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await deleteEvidenceFile(applicationId, file.id);
      setNotice(result.ok ? `已移除「${file.name}」。` : result.message);
      if (result.ok) {
        setSelection(current => current.filter(entry => entry.original?.id !== file.id));
        setConfirmId(null);
        router.refresh();
      }
    } catch {
      setNotice("没能移除文件，请重试。");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function fileRow(file: EvidenceFile) {
    const hasTranslations = files.some(item => item.originalId === file.id) || selection.some(item => item.original?.id === file.id);
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs text-muted-foreground">{file.role === "translation" ? "英文译本" : "原件"}</span>
        <EvidenceDownload file={file} />
        <span className="text-xs text-muted-foreground">{fileSize(file.size)}</span>
        {confirmId === file.id ? (
          <span className="flex flex-wrap items-center gap-2 text-sm">
            {hasTranslations ? "移除原件也会移除它的英文译本。确认移除？" : "确认移除这个文件？"}
            <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => remove(file)}>确认移除</Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmId(null)}>取消</Button>
          </span>
        ) : <>
          {file.role === "original" && <Button type="button" variant="outline" size="sm" disabled={busy}
            aria-label={`为 ${file.name} 添加英文译本`} onClick={() => {
              translationTarget.current = { id: file.id, name: file.name };
              translationInput.current?.click();
            }}>添加英文译本</Button>}
          <Button type="button" variant="ghost" size="sm" aria-label={`移除 ${file.name}`} disabled={busy} onClick={() => setConfirmId(file.id)}>移除</Button>
        </>}
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-3">
      {originals.length > 0 && (
        <ul aria-label="已保存的文件" className="grid gap-2 text-sm">
          {originals.map(file => (
            <li key={file.id}>
              {fileRow(file)}
              <ul className="ms-3 border-s ps-3">
                {files.filter(item => item.originalId === file.id).map(item => <li key={item.id}>{fileRow(item)}</li>)}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <input type="file" hidden ref={translationInput} multiple accept={ACCEPT_DOCUMENTS} disabled={busy}
        onChange={event => { if (translationTarget.current) selectFiles(event.currentTarget, translationTarget.current); }} />
      <Field className="gap-1.5">
        <FieldLabel htmlFor={`${controlId}-file`}>选择原件</FieldLabel>
        <Input type="file" id={`${controlId}-file`} accept={ACCEPT_DOCUMENTS} multiple disabled={busy}
          aria-describedby={`${controlId}-limits`} onChange={event => selectFiles(event.currentTarget, null)} />
        <FieldDescription id={`${controlId}-limits`}>PDF、JPEG 或 PNG，每个最多 10 MiB。每份草稿最多 40 个文件，合计 100 MiB。</FieldDescription>
      </Field>
      {selection.length > 0 && <ul aria-label="上传队列" className="grid gap-3 text-sm">
        {selection.map(entry => <li key={entry.requestId} className="grid gap-1">
          <p className="break-all"><strong>{entry.file.name}</strong> · {fileSize(entry.file.size)}</p>
          <p>{entry.original ? `「${entry.original.name}」的英文译本` : "原件"} · {{
            ready: "待上传", uploading: "上传中", failed: "上传未完成", rejected: "需要更换",
          }[entry.state]}</p>
          {entry.message && <p className="text-destructive">{entry.message}</p>}
          <div className="flex flex-wrap gap-2">
            {entry.state === "failed" && <Button type="button" size="sm" variant="outline"
              aria-label={`重试上传 ${entry.file.name}`} disabled={busy} onClick={() => upload([entry])}>重试上传</Button>}
            <Button type="button" size="sm" variant="ghost" aria-label={`从队列移除 ${entry.file.name}`}
              disabled={busy} onClick={() => {
                setSelection(current => current.filter(item => item.requestId !== entry.requestId));
                setNotice(`已从队列移除「${entry.file.name}」。`);
              }}>从队列移除</Button>
          </div>
        </li>)}
      </ul>}
      {uploadable.length > 0 && <div><Button type="button" size="sm" disabled={busy}
        onClick={() => upload(uploadable)}>上传所选文件（{uploadable.length}）</Button></div>}
      <p role="status" className="text-sm empty:hidden">{notice}</p>
    </div>
  );
}
