import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { EVIDENCE_LABELS, OFFICIAL, evidenceFor, type Answers } from "@/lib/workspace/model";
import type { EvidenceFile } from "@/lib/workspace/storage-policy";

export type GroupedFiles = Record<string, EvidenceFile[]>;

export function checklistGroups(answers: Answers, notes: Record<string, string>, files: GroupedFiles) {
  const rules = evidenceFor(answers);
  const inactive = [...new Set([...Object.keys(files), ...Object.keys(notes)])].filter(
    (key) => (files[key]?.length || notes[key]?.trim()) && !rules.some((rule) => rule.key === key),
  );
  return { rules, inactive };
}

export function evidenceStatus(files: EvidenceFile[] = [], note = "") {
  if (files.length) return `已添加 ${files.length} 份文件`;
  return note.trim() ? "已写说明" : "待整理";
}

export function EvidenceChecklist({ answers, files, notes, onChange, expiry }: {
  applicationId: string; answers: Answers; files: GroupedFiles; notes: Record<string, string>;
  onChange: (key: string, value: string) => void; expiry: string;
}) {
  const {rules, inactive} = checklistGroups(answers, notes, files);
  const count = rules.filter(({key}) => files[key]?.length || notes[key]?.trim()).length;
  function contents(key: string) {
    return <>
      <Field><FieldLabel htmlFor={`note-${key}`}>补充说明（选填）</FieldLabel>
        <Textarea id={`note-${key}`} name={`note-${key}`} rows={2}
          placeholder="例如，暂时无法提供这份材料的原因" value={notes[key] ?? ""} maxLength={4000}
          onChange={(e) => onChange(key, e.target.value)} />
      </Field>
    </>;
  }
  return <div className="workspace-stack">
    <p>按你的访问目的和费用安排整理材料。非英文文件请保留原件及对应的英文翻译，最后按你在 ImmiAccount 收到的材料清单逐项核对。</p>
    <p className="workspace-meta">文件保存在你的私人草稿中，当前保留至 {expiry}。主动继续准备或成功修改后，保存期重新计算为 90 天。你可以在下方移除单个文件，也可以在「我的草稿」删除整份申请。</p>
    <p className="workspace-progress-label">已为 {count} / {rules.length} 项添加文件或说明</p>
    {rules.map((rule) => <details className="workspace-item" key={rule.key}>
      <summary>{rule.title}<span className="workspace-meta">{evidenceStatus(files[rule.key], notes[rule.key])}</span></summary>
      <div className="workspace-stack"><p>{rule.description}</p>
        <p className="workspace-meta"><a href={rule.source}>Home Affairs 指引</a> · 核对日期 {rule.reviewed}</p>
        {contents(rule.key)}
      </div>
    </details>)}
    {inactive.length > 0 && <section className="workspace-stack"><h3>先前保存的材料</h3>
      <p>这些项目对应之前的回答，文件和说明仍可查看。</p>
      {inactive.map((key) => <details key={key} className="workspace-item"><summary>{EVIDENCE_LABELS[key] ?? key}</summary>
        <div className="workspace-stack">{contents(key)}</div></details>)}
    </section>}
    <a href={OFFICIAL.attachments}>查看 Home Affairs 的附件说明</a>
  </div>;
}
