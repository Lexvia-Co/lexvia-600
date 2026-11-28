"use client";

import { useRef, useState } from "react";
import { exportEvidence } from "@/app/applications/[id]/export/actions";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { DOCUMENT_CHECK_GUIDANCE, isReferenceFile } from "@/lib/workspace/document-checks";
import { EVIDENCE_LABELS } from "@/lib/workspace/model";
import type { EvidenceFile } from "@/lib/workspace/storage-policy";
import type { GroupedFiles } from "./evidence-checklist";

export function EvidenceExport({ applicationId, files }: { applicationId: string; files: GroupedFiles }) {
  const [choices, setChoices] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const exporting = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const groups = Object.entries(files).flatMap(([key, entries]) => entries.filter(file => file.role === "original")
    .map(original => ({ key, entries, original, translations: entries.filter(file => file.originalId === original.id) })));
  const checked = (file: EvidenceFile, entries: EvidenceFile[]) => choices[file.id] ?? !isReferenceFile(file, entries);
  const selectedGroups = groups.filter(({ original, translations, entries }) =>
    [original, ...translations].some(file => checked(file, entries)));
  const selected = selectedGroups.flatMap(({ original, translations, entries }) =>
    [original, ...translations].filter(file => checked(file, entries)).map(file => file.id));

  async function download() {
    if (exporting.current) return;
    if (!selected.length) {
      setNotice("请至少勾选一份要下载的文件。");
      form.current?.querySelector<HTMLInputElement>("input")?.focus();
      return;
    }
    exporting.current = true;
    setBusy(true);
    setNotice("正在生成材料包…");
    try {
      const result = await exportEvidence(applicationId, selected);
      if (!result.ok) { setNotice(result.message); return; }
      const link = document.createElement("a");
      link.href = result.url;
      link.referrerPolicy = "no-referrer";
      link.download = "VBER-evidence.zip";
      document.body.append(link);
      link.click();
      link.remove();
      setNotice("已开始下载。如果下载中断，可以重新下载所选文件。");
    } catch {
      setNotice("下载中断，请重试。你的选择已保留。");
    } finally {
      exporting.current = false;
      setBusy(false);
    }
  }

  function choice(file: EvidenceFile, entries: EvidenceFile[]) {
    return <FieldLabel key={file.id} htmlFor={`export-${file.id}`} className="min-h-12 min-w-0 items-center">
      <input id={`export-${file.id}`} name="document" value={file.id} type="checkbox"
        className="size-4 shrink-0 accent-primary" checked={checked(file, entries)}
        onChange={event => {
          const selected = event.currentTarget.checked;
          setChoices(current => ({ ...current, [file.id]: selected }));
          setNotice("");
        }} />
      <span className="break-all">{file.role === "original" ? "原件" : "英文译本"} · {file.name}
        {isReferenceFile(file, entries) && "（仅供留存）"}</span>
    </FieldLabel>;
  }

  return <section id="evidence-export" className="workspace-review-section no-print">
    <h2 id="export-title">下载递交材料包</h2>
    {groups.length ? <form aria-labelledby="export-title" ref={form} method="post" className="workspace-stack"
      onSubmit={event => { event.preventDefault(); void download(); }}>
      <p>解压 ZIP 后，按中英对照目录找到原件和译本，再依照 ImmiAccount 的清单逐份上传。请保留一份本地副本。</p>
      <p className="workspace-meta"><a href={DOCUMENT_CHECK_GUIDANCE.attachments}>Home Affairs 附件指引</a>
        （核对日期：{DOCUMENT_CHECK_GUIDANCE.reviewed}）</p>
      <FieldGroup className="gap-3">{groups.map(group => {
        const { key, entries, original, translations } = group;
        const number = selectedGroups.indexOf(group) + 1;
        return <FieldSet disabled={busy} key={original.id} className="gap-0">
          <FieldLegend variant="label" className="break-all">{number > 0 && `${String(number).padStart(2, "0")} · `}
            {EVIDENCE_LABELS[key] ?? key} · {original.name}</FieldLegend>
          {choice(original, entries)}
          {translations.map(file => choice(file, entries))}
        </FieldSet>;
      })}</FieldGroup>
      <div><Button disabled={busy} type="submit">下载所选文件（{selected.length}）</Button></div>
      <p role="status" className="workspace-meta empty:hidden">{notice}</p>
    </form> : <p>添加证明材料后，可以在这里下载原件和英文译本。</p>}
  </section>;
}
