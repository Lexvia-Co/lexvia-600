import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { EVIDENCE_LABELS, evidenceFor, type Answers } from "@/lib/workspace/model";
import type { EvidenceFile } from "@/lib/workspace/storage-policy";
import { DOCUMENT_CHECK_GUIDANCE, documentIssues, isReferenceFile } from "@/lib/workspace/document-checks";
import { EvidenceFiles } from "./evidence-files";
import type { FileQueueState } from "./evidence-upload-queue";

export type GroupedFiles = Record<string, EvidenceFile[]>;
export type { FileQueueState } from "./evidence-upload-queue";

export function checklistGroups(answers: Answers, notes: Record<string, string>, files: GroupedFiles) {
  const rules = evidenceFor(answers);
  const inactive = [...new Set([...Object.keys(files), ...Object.keys(notes)])].filter(
    (key) => (files[key]?.length || notes[key]?.trim()) && !rules.some((rule) => rule.key === key),
  );
  return { rules, inactive };
}

export function evidenceStatus(files: EvidenceFile[] = [], note = "") {
  if (files.length) {
    const flagged = files.filter(file => documentIssues(file, files).length > 0).length;
    const reference = files.filter(file => isReferenceFile(file, files)).length;
    return [`已添加 ${files.length} 份文件`, flagged && `${flagged} 份待处理`, reference && `${reference} 份仅供留存`]
      .filter(Boolean).join(" · ");
  }
  return note.trim() ? "仅有说明" : "待整理";
}

export function EvidenceChecklist({ applicationId, answers, files, notes, onChange, expiry, onFileQueueChange }: {
  applicationId: string; answers: Answers; files: GroupedFiles; notes: Record<string, string>;
  onChange: (key: string, value: string) => void; expiry: string;
  onFileQueueChange?: (key: string, state: FileQueueState) => void;
}) {
  const {rules, inactive} = checklistGroups(answers, notes, files);
  const withFiles = rules.filter(({key}) => files[key]?.length).length;
  const notesOnly = rules.filter(({key}) => !files[key]?.length && notes[key]?.trim()).length;
  function contents(key: string) {
    return <>
      <EvidenceFiles applicationId={applicationId} evidenceKey={key} files={files[key] ?? []} onFileQueueChange={onFileQueueChange} />
      <Field><FieldLabel htmlFor={`note-${key}`}>补充说明（选填）</FieldLabel>
        <Textarea id={`note-${key}`} name={`note-${key}`} rows={2}
          aria-describedby={`note-help-${key}`} value={notes[key] ?? ""} maxLength={4000}
          onChange={(e) => onChange(key, e.target.value)} />
        <FieldDescription id={`note-help-${key}`}>可以记下还缺什么，以及打算什么时候补上。写好后点「保存草稿」。</FieldDescription>
      </Field>
    </>;
  }
  return <div className="workspace-stack">
    <div className="grid gap-2">
      <p>上传后，VBER 会检查文件能否读取、大小是否合适、PDF 是否受保护，以及非英文原件是否配有英文译本。递交时，请按你在 ImmiAccount 看到的清单上传材料。</p>
      <p className="workspace-meta">Home Affairs 指引 · <a href={DOCUMENT_CHECK_GUIDANCE.attachments}>附件大小与格式</a> · <a href={DOCUMENT_CHECK_GUIDANCE.translations}>英文译本要求</a>（核对日期：{DOCUMENT_CHECK_GUIDANCE.reviewed}）</p>
    </div>
    <p className="workspace-meta">文件保存在这份草稿里，保留至 {expiry}。继续准备或保存修改后，会再保留 90 天。你可以单独移除文件，也可以在「我的草稿」删除整份草稿。</p>
    <p className="workspace-progress-label">共 {rules.length} 项材料 · {withFiles} 项已有文件 · {notesOnly} 项仅有说明</p>
    {rules.map((rule) => <details className="workspace-item" key={rule.key}>
      <summary id={`evidence-${rule.key}`}>{rule.title}<span className="workspace-meta">{evidenceStatus(files[rule.key], notes[rule.key])}</span></summary>
      <div className="workspace-stack"><p>{rule.description}</p>
        <p className="workspace-meta"><a href={rule.source}>Home Affairs 指引</a></p>
        {contents(rule.key)}
      </div>
    </details>)}
    {inactive.length > 0 && <section className="workspace-stack"><h3>先前保存的材料</h3>
      <p>改过行程或费用安排后，之前添加的文件和说明仍保存在这里。</p>
      {inactive.map((key) => <details key={key} className="workspace-item"><summary id={`evidence-${key}`}>{EVIDENCE_LABELS[key] ?? key}<span className="workspace-meta">{evidenceStatus(files[key], notes[key])}</span></summary>
        <div className="workspace-stack">{contents(key)}</div></details>)}
    </section>}
  </div>;
}
