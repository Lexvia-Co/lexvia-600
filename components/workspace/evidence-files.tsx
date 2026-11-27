"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { beginEvidenceUpload, deleteEvidenceFile, finishEvidenceUpload } from "@/app/applications/[id]/upload-actions";
import { ACCEPT_DOCUMENTS, validFileName, validFileSize, type EvidenceFile } from "@/lib/workspace/storage-policy";

function fileSize(size: number) {
  return size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
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

type SelectedFile = { file: File; requestId: string };

export function EvidenceFiles({
  applicationId, evidenceKey, files,
}: {
  applicationId: string; evidenceKey: string; files: EvidenceFile[];
}) {
  const router = useRouter();
  const controlId = useId();
  const input = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [originalId, setOriginalId] = useState("");
  const [selection, setSelection] = useState<SelectedFile[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const originals = files.filter(file => file.role === "original");
  const target = originals.some(file => file.id === originalId) ? originalId : "";

  function selectFiles(list: FileList | null) {
    const chosen = Array.from(list ?? []);
    setNotice("");
    if (chosen.some(file => !validFileSize(file.size) || !validFileName(file.name))) {
      setNotice("请选择大小在 10 MiB 以内的非空 PDF、JPEG 或 PNG 文件，并检查文件名。");
      setSelection([]);
      if (input.current) input.current.value = "";
      return;
    }
    setSelection(chosen.map(file => ({ file, requestId: crypto.randomUUID() })));
  }

  async function upload() {
    if (busyRef.current || !selection.length) return;
    busyRef.current = true;
    setBusy(true);
    try {
      for (const [index, { file, requestId }] of selection.entries()) {
        setNotice(`正在上传第 ${index + 1} 个文件，共 ${selection.length} 个。`);
        const ticket = await beginEvidenceUpload(applicationId, {
          fileName: file.name, size: file.size, evidenceKey, requestId,
          role: target ? "translation" : "original", originalId: target || null,
        });
        if (!ticket.ok) { setNotice(ticket.message); return; }
        if (ticket.url) {
          const response = await fetch(ticket.url, {
            method: "PUT", body: file, credentials: "omit", referrerPolicy: "no-referrer", redirect: "error",
          });
          if (!response.ok) { setNotice("上传未完成，请重试。"); return; }
          const result = await finishEvidenceUpload(applicationId, ticket.id);
          if (!result.ok) { setNotice(result.message); return; }
        }
        // Keep the same request token for any file whose acknowledgement was interrupted.
        setSelection(items => items.filter(item => item.requestId !== requestId));
      }
      if (input.current) input.current.value = "";
      setNotice("文件已保存。");
    } catch {
      setNotice("连接中断，请重试。已保存的文件会保留。");
    } finally {
      busyRef.current = false;
      setBusy(false);
      router.refresh();
    }
  }

  async function remove(id: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await deleteEvidenceFile(applicationId, id);
      setNotice(result.ok ? "文件已移除。" : result.message);
      if (result.ok) { setConfirmId(null); router.refresh(); }
    } catch {
      setNotice("文件移除失败，请重试。");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function fileRow(file: EvidenceFile) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs text-muted-foreground">{file.role === "translation" ? "英文译本" : "原件"}</span>
        <EvidenceDownload file={file} />
        <span className="text-xs text-muted-foreground">{fileSize(file.size)}</span>
        {confirmId === file.id ? (
          <span className="flex flex-wrap items-center gap-2 text-sm">
            {files.some(item => item.originalId === file.id) ? "原件及关联译本将一并移除。" : "确认移除这个文件？"}
            <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => remove(file.id)}>确认移除</Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmId(null)}>取消</Button>
          </span>
        ) : (
          <Button type="button" variant="ghost" size="sm" aria-label={`移除 ${file.name}`} disabled={busy} onClick={() => setConfirmId(file.id)}>移除</Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {originals.length > 0 && (
        <ul className="grid gap-2 text-sm">
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
      <FieldGroup className="gap-3">
        {originals.length > 0 && (
          <Field className="gap-1.5">
            <FieldLabel htmlFor={`${controlId}-target`}>添加到</FieldLabel>
            <select id={`${controlId}-target`} value={target} disabled={busy || selection.length > 0}
              className="min-h-9 w-full max-w-full rounded-md border border-input bg-background px-2 text-sm"
              onChange={event => setOriginalId(event.target.value)}>
              <option value="">新的原件</option>
              {originals.map(file => <option value={file.id} key={file.id}>{file.name} 的英文译本</option>)}
            </select>
          </Field>
        )}
        <Field className="gap-1.5">
          <FieldLabel htmlFor={`${controlId}-file`}>{target ? "选择英文译本" : "选择原件"}</FieldLabel>
          <Input type="file" id={`${controlId}-file`} ref={input} accept={ACCEPT_DOCUMENTS} multiple disabled={busy}
            aria-describedby={`${controlId}-limits`} onChange={event => selectFiles(event.target.files)} />
          <FieldDescription id={`${controlId}-limits`}>PDF、JPEG 或 PNG，每个文件最多 10 MiB。每份草稿最多 40 个文件，共 100 MiB。</FieldDescription>
        </Field>
      </FieldGroup>
      {selection.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={upload}>上传所选文件（{selection.length}）</Button>
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => {
            setSelection([]); setNotice(""); if (input.current) input.current.value = "";
          }}>取消选择</Button>
        </div>
      )}
      <p aria-live="polite" role="status" className="text-sm empty:hidden">{notice}</p>
    </div>
  );
}
