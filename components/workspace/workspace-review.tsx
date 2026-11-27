import { Button } from "@/components/ui/button";
import { ANSWER_STEPS } from "@/lib/workspace/step-progress";
import { ANSWER_LABELS, EVIDENCE_LABELS, STEP_LABELS, TEMPLATE_LABELS, TEMPLATE_REVIEW_NOTICE, templateFingerprint, validateStep,
  type Answers, type Step, type TemplateKind } from "@/lib/workspace/model";
import { answerDisplay, visibleFields } from "./answer-fields";
import { checklistGroups, evidenceStatus, type GroupedFiles } from "./evidence-checklist";
import { EvidenceDownload } from "./evidence-files";
import type { SavedTemplates } from "./editor-types";

export function WorkspaceReview({ answers, files, notes, templates, onEdit }: {
  answers: Answers; files: GroupedFiles; notes: Record<string, string>; templates: SavedTemplates;
  onEdit: (step: Step, fieldId?: string) => void;
}) {
  const {rules, inactive} = checklistGroups(answers, notes, files);
  const incomplete = ANSWER_STEPS.flatMap((step) =>
    Object.entries(validateStep(step, answers)).map(([key, reason]) => ({key, step, reason})));
  const savedTemplates = Object.entries(templates);
  return <div className="workspace-stack">
    <p>看看下面的回答和材料有没有遗漏。你可以随时修改，再到自己的 ImmiAccount 递交申请。</p>
    {incomplete.length > 0 && <section className="workspace-notice">
      <h2>仍需核对的回答</h2><ul>{incomplete.map(({key, step, reason}) =>
        <li key={key}><Button className="review-issue" variant="link" type="button" onClick={() => onEdit(step, key)}>{reason}</Button></li>)}</ul>
    </section>}
    {ANSWER_STEPS.map((step) => <section key={step} className="workspace-review-section">
      <h2>{STEP_LABELS[step]}</h2>
      <dl className="workspace-values">{visibleFields(step, answers).map((key) =>
        <div key={key}><dt>{ANSWER_LABELS[key]}</dt><dd>{answerDisplay(key, answers[key]) || "未填写"}</dd>
          <dd className="review-edit no-print"><Button id={`review-${key}`} type="button" variant="link" size="sm"
            aria-label={`修改${ANSWER_LABELS[key]}`} onClick={() => onEdit(step, key)}>修改</Button></dd>
        </div>)}</dl>
    </section>)}
    <section className="workspace-review-section"><div className="workspace-section-heading"><h2>文件与说明</h2>
      <Button id="review-evidence" type="button" variant="link" className="no-print" onClick={() => onEdit("evidence")}>修改证明材料</Button></div>
      {[...rules.map(({key}) => key), ...inactive].map((key) => <div key={key} className="workspace-review-item">
        <h3>{EVIDENCE_LABELS[key] ?? key}{inactive.includes(key) && "（先前保存）"}</h3>
        <p>{evidenceStatus(files[key], notes[key])}</p>
        {!inactive.includes(key) && <Button id={`review-evidence-${key}`} variant="link" type="button"
          className="no-print justify-self-start" onClick={() => onEdit("evidence", "evidence-" + key)}>
          整理{EVIDENCE_LABELS[key]}
        </Button>}
        {notes[key] && <p className="workspace-prewrap">说明：{notes[key]}</p>}
        {!!files[key]?.length && <ul>{files[key].map((file) => <li key={file.id}>
          {file.role === "original" ? "原件" : "英文译本"} · <EvidenceDownload file={file} />
          {file.originalId && <span className="workspace-meta">（对应原件：{files[key].find((original) => original.id === file.originalId)?.name}）</span>}
        </li>)}</ul>}
      </div>)}
    </section>
    <section className="workspace-review-section"><div className="workspace-section-heading"><h2>文书草稿</h2>
      <Button id="review-templates" type="button" variant="link" className="no-print" onClick={() => onEdit("templates")}>修改文书</Button></div>
      {savedTemplates.length ? savedTemplates.map(([key, entry]) => {
        const kind = key as TemplateKind;
        return <section key={kind} className="workspace-review-item">
          <h3 id={`review-${kind}`} tabIndex={-1}>{TEMPLATE_LABELS[kind]}</h3>
          {entry.fingerprint !== templateFingerprint(kind, answers) && <>
            <p><strong>{TEMPLATE_REVIEW_NOTICE}</strong></p>
            <Button type="button" variant="outline" className="no-print" onClick={() => onEdit("templates", kind)}>
              核对{TEMPLATE_LABELS[kind]}
            </Button>
          </>}
          <p className="workspace-prewrap" lang="en">{entry.body || "（空白文稿）"}</p>
        </section>;
      }) : <p>尚未选用文书模板。</p>}
    </section>
    <section className="workspace-notice no-print"><h2>递交申请</h2>
      <p>打开 ImmiAccount，按里面的清单填写答案、上传文件，再缴费递交。回来后，你还可以修改这份草稿。</p>
      <div className="workspace-actions">
        <Button type="button" variant="outline" onClick={() => window.print()}>打印准备摘要</Button>
      </div>
    </section>
  </div>;
}

export function Aftercare() {
  return <div className="workspace-stack">
    <p>完成递交后，使用提交申请的 ImmiAccount 查看进度和来信，并留意与该账户关联的邮箱。</p>
    <section><h2>收到补件通知</h2><p>在通知中核对所需材料、提交方式和截止日期，按通知要求在 ImmiAccount 操作。</p></section>
    <section><h2>体检与生物识别</h2><p>如果 Home Affairs 要求你体检或提供生物识别信息，请按来信中的步骤安排。</p></section>
    <section><h2>收到决定</h2><p>阅读决定通知。如获签，请核对准签信中列出的有效期、可停留时间及签证条件。</p></section>
    <div className="workspace-actions">
      <Button asChild variant="outline"><a href="https://immi.homeaffairs.gov.au/help-support/applying-online-or-on-paper/online/after-you-apply">查看 Home Affairs 递交后指引</a></Button>
    </div>
  </div>;
}
