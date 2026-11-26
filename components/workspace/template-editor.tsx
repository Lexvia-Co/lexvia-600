"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { TEMPLATE_LABELS, templateText, templateFingerprint, type Answers, type TemplateKind } from "@/lib/workspace/model";
import type { SavedTemplates } from "./editor-types";

export function TemplateEditor({ answers, templates, onChange }: {
  answers: Answers; templates: SavedTemplates;
  onChange: (kind: TemplateKind, template: {body: string; fingerprint: string}) => void;
}) {
  const [replace, setReplace] = useState<TemplateKind | null>(null);
  const [feedback, setFeedback] = useState("");
  const [preview, setPreview] = useState<{ title: string; body: string } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (preview) dialog.current?.showModal();
  }, [preview]);
  return <div className="workspace-stack">
    <p>按需要选择文书。请核实内容，把方括号和仍为中文的内容改为准确的英文。邀请信及单位证明应由出具人确认和签署。</p>
    {(Object.keys(TEMPLATE_LABELS) as TemplateKind[]).map((kind) => {
      const previous = templates[kind];
      const fingerprint = templateFingerprint(kind, answers);
      const body = previous?.body ?? templateText(kind, answers);
      return <details key={kind} className="workspace-item">
        <summary>{TEMPLATE_LABELS[kind]}{previous && <span className="workspace-meta"> · 已有文稿</span>}</summary>
        <div className="workspace-stack">
          {previous && previous.fingerprint !== fingerprint && <div className="workspace-notice">
            <p>相关申请信息已有更新。请核对下方文稿，或从当前答案重新生成。</p>
            <Button type="button" variant="outline" onClick={() => {
              onChange(kind, { body, fingerprint }); setFeedback("已标记为核对，请保存草稿。");
            }}>已核对，保留当前文稿</Button>
          </div>}
          <Field><FieldLabel htmlFor={kind}>英文文稿</FieldLabel>
            <Textarea id={kind} name={kind} rows={10} lang="en" maxLength={16000} value={body}
              onChange={(e) => onChange(kind, { body: e.target.value, fingerprint: previous?.fingerprint ?? fingerprint })} />
          </Field>
          <div className="workspace-actions">
            <Button type="button" variant="outline" onClick={() => setPreview({ title: TEMPLATE_LABELS[kind], body })}>预览与打印</Button>
            <Button type="button" variant="outline" onClick={async () => {
              try { await navigator.clipboard.writeText(body); setFeedback("已复制" + TEMPLATE_LABELS[kind] + "。"); }
              catch { setFeedback("请选中文稿后复制。"); }
            }}>复制文稿</Button>
            {previous ? <Button type="button" variant="ghost" onClick={() => setReplace(kind)}>重新生成</Button> :
              <Button type="button" variant="ghost" onClick={() => onChange(kind, { body, fingerprint })}>使用此文稿</Button>}
          </div>
          {replace === kind && <div className="workspace-notice">
            <p>重新生成会替换这份文稿中的手动修改。</p>
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
        <h2 id="template-preview-title" className="no-print">{preview.title}</h2>
        <p className="template-paper" lang="en">{preview.body}</p>
        <div className="workspace-actions no-print">
          <Button type="button" onClick={() => window.print()}>打印或存为 PDF</Button>
          <Button type="button" variant="outline" onClick={() => dialog.current?.close()}>关闭预览</Button>
        </div>
      </>}
    </dialog>
  </div>;
}
