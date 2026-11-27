"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { MAX_TEMPLATE_LENGTH, TEMPLATE_LABELS, TEMPLATE_REVIEW_NOTICE, templateText, templateFingerprint,
  type Answers, type TemplateKind } from "@/lib/workspace/model";
import type { SavedTemplates } from "./editor-types";

export function TemplateEditor({ answers, templates, onChange }: {
  answers: Answers; templates: SavedTemplates;
  onChange: (kind: TemplateKind, template: {body: string; fingerprint: string}) => void;
}) {
  const [replace, setReplace] = useState<TemplateKind | null>(null);
  const [feedback, setFeedback] = useState("");
  const [preview, setPreview] = useState<TemplateKind | null>(null);
  const previewEntry = preview && templates[preview];
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (preview) dialog.current?.showModal();
  }, [preview]);
  return <div className="workspace-stack">
    <p>选一份需要的模板，把方括号里的提示换成自己的信息，再把文中剩下的中文改成英文。邀请信请亲友核对并签字，单位证明请交给单位核对并签字。</p>
    {(Object.keys(TEMPLATE_LABELS) as TemplateKind[]).map((kind) => {
      const previous = templates[kind];
      const fingerprint = templateFingerprint(kind, answers);
      const body = previous?.body ?? templateText(kind, answers);
      const needsReview = previous && previous.fingerprint !== fingerprint;
      return <details key={kind} className="workspace-item">
        <summary>{TEMPLATE_LABELS[kind]}{previous && <span className="workspace-meta"> · {needsReview ? "待核对" : "已有文稿"}</span>}</summary>
        <div className="workspace-stack">
          {needsReview && <div className="workspace-notice">
            <p id={kind + "-review"}>{TEMPLATE_REVIEW_NOTICE}</p>
            <Button type="button" variant="outline" onClick={() => {
              onChange(kind, { body, fingerprint }); setFeedback("已核对。点「保存草稿」保留这次修改。");
            }}>已核对，保留这版</Button>
          </div>}
          <Field><FieldLabel htmlFor={kind}>英文文稿</FieldLabel>
            <Textarea id={kind} name={kind} rows={10} lang="en" maxLength={MAX_TEMPLATE_LENGTH} value={body}
              aria-describedby={needsReview ? kind + "-limit " + kind + "-review" : kind + "-limit"}
              onChange={(e) => onChange(kind, { body: e.target.value, fingerprint: previous?.fingerprint ?? fingerprint })} />
            <FieldDescription id={kind + "-limit"}>最多可输入 {MAX_TEMPLATE_LENGTH.toLocaleString("zh-CN")} 个字符。</FieldDescription>
          </Field>
          <div className="workspace-actions">
            <Button type="button" variant="outline" onClick={() => setPreview(kind)}>预览与打印</Button>
            <Button type="button" variant="outline" onClick={async () => {
              try { await navigator.clipboard.writeText(body); setFeedback(TEMPLATE_LABELS[kind] + "已复制。"); }
              catch { setFeedback("没能自动复制，请选中文稿再复制。"); }
            }}>复制文稿</Button>
            {previous ? <Button type="button" variant="ghost" onClick={() => setReplace(kind)}>重新生成</Button> :
              <Button type="button" variant="ghost" onClick={() => onChange(kind, { body, fingerprint })}>使用此文稿</Button>}
          </div>
          {replace === kind && <div className="workspace-notice">
            <p>重新生成会覆盖你在这份文稿里改过的内容。</p>
            <div className="workspace-actions"><Button type="button" onClick={() => {
              onChange(kind, { body: templateText(kind, answers), fingerprint }); setReplace(null);
            }}>替换文稿</Button>
              <Button type="button" variant="outline" onClick={() => setReplace(null)}>保留我的版本</Button></div>
          </div>}
        </div>
      </details>;
    })}
    <p role="status">{feedback}</p>
    <dialog ref={dialog} data-print-template className="template-preview" aria-labelledby="template-preview-title" onClose={() => setPreview(null)}>
      {preview && <>
        <h2 id="template-preview-title" className="no-print">{TEMPLATE_LABELS[preview]}</h2>
        {previewEntry && previewEntry.fingerprint !== templateFingerprint(preview, answers) &&
          <p><strong>{TEMPLATE_REVIEW_NOTICE}</strong></p>}
        <p className="template-paper" lang="en">{previewEntry?.body ?? templateText(preview, answers)}</p>
        <div className="workspace-actions no-print">
          <Button type="button" onClick={() => window.print()}>打印或存为 PDF</Button>
          <Button type="button" variant="outline" onClick={() => dialog.current?.close()}>关闭预览</Button>
        </div>
      </>}
    </dialog>
  </div>;
}
