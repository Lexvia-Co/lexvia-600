"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveDraft } from "@/app/applications/actions";
import { STEP_FIELDS, STEP_LABELS, STEPS, normalizeAnswers, type Answers, type Step } from "@/lib/workspace/model";
import { AnswerFields } from "./answer-fields";
import { EvidenceChecklist, type GroupedFiles } from "./evidence-checklist";
import { TemplateEditor } from "./template-editor";
import { Aftercare, WorkspaceReview } from "./workspace-review";
import { formatDate, type AnswerErrors, type SavedTemplates } from "./editor-types";

type Props = {
  id: string; revision: number; step: Step; initialAnswers: Partial<Answers>;
  initialNotes: Record<string, string>; initialTemplates: SavedTemplates;
  files: GroupedFiles; updatedAt: string; expiresAt: string;
};

export function DraftEditor(props: Props) {
  const { id, step, files } = props;
  const router = useRouter();
  const [answers, setAnswers] = useState(() => normalizeAnswers(props.initialAnswers));
  const [notes, setNotes] = useState(props.initialNotes);
  const [templates, setTemplates] = useState(props.initialTemplates);
  const [revision, setRevision] = useState(props.revision);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false);
  const [errors, setErrors] = useState<AnswerErrors>({});
  const [pending, start] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const next = STEPS[STEPS.indexOf(step) + 1];
  const fields = STEP_FIELDS[step];
  const finalStep = step === "aftercare";

  // Next may preserve a previously visited step. Adopt the latest server snapshot
  // for a clean form and keep a dirty form's original revision for conflict detection.
  if (!dirty && props.revision > revision) {
    setAnswers(normalizeAnswers(props.initialAnswers));
    setNotes(props.initialNotes);
    setTemplates(props.initialTemplates);
    setRevision(props.revision);
    setErrors({});
    setConflict(false);
  }

  useEffect(() => {
    const panel = heading.current?.closest(".workspace-current");
    const fragment = window.location.hash.slice(1);
    const target = fragment && panel?.querySelector<HTMLElement>("#" + CSS.escape(fragment));
    if (target) {
      const group = target.closest("details");
      if (group) group.open = true;
      target.focus();
      target.scrollIntoView({ block: "center" });
    } else {
      heading.current?.focus({ preventScroll: true });
    }
  }, [step]);
  useEffect(() => {
    if (!dirty) return;
    function onLeave(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  function changed() { setDirty(true); setMessage(""); }
  function save(destination: Step, advance = false, close = false, fieldId?: string) {
    if (pending || conflict) return;
    setMessage("");
    start(async () => {
      try {
        const result = await saveDraft({
          id, revision, step, destination, continue: advance,
          answers: fields.length ? Object.fromEntries(fields.map((key) => [key, answers[key]])) : undefined,
          notes: step === "evidence" ? notes : undefined,
          templates: step === "templates" ? templates : undefined,
        });
        if (!result.ok) {
          setErrors(result.errors ?? {}); setConflict(!!result.conflict); setMessage(result.message);
          const first = Object.keys(result.errors ?? {})[0];
          if (first) requestAnimationFrame(() => heading.current?.closest(".workspace-current")?.querySelector<HTMLElement>("#" + CSS.escape(first))?.focus());
          return;
        }
        setErrors({}); setDirty(false); setRevision(result.revision);
        setMessage("已保存草稿。");
        if (close) router.push("/applications");
        else if (destination !== step) router.push(`/applications/${id}/${destination}` + (fieldId ? "#" + encodeURIComponent(fieldId) : ""));
      } catch { setMessage("未能确认保存结果。请检查网络连接，保留当前页面后重试。"); }
    });
  }
  function dashboard() {
    if (dirty) save(step, false, true);
    else router.push("/applications");
  }
  const actionBar = <div className="workspace-actions workspace-step-actions no-print">
    {!finalStep && <Button type="button" variant="outline" disabled={pending || conflict} onClick={() => save(step)}>保存草稿</Button>}
    {next && <Button type={fields.length ? "submit" : "button"} disabled={pending || conflict}
      onClick={fields.length ? undefined : () => save(next, true)}>保存并继续</Button>}
    {finalStep && <Button type="button" variant="outline" onClick={dashboard}>返回我的草稿</Button>}
  </div>;
  return <div className="workspace-editor">
    <aside className="workspace-sidebar no-print">
      <Button type="button" variant="ghost" disabled={pending} onClick={dashboard}>← 我的草稿</Button>
      <nav aria-label="申请准备步骤"><ol>{STEPS.map((item, index) => <li key={item}>
        <button type="button" disabled={pending || conflict} aria-current={item === step ? "step" : undefined}
          onClick={() => { if (item !== step) save(item); }}>
          <span aria-hidden="true">{index + 1}</span>{STEP_LABELS[item]}
        </button>
      </li>)}</ol></nav>
    </aside>
    <section className="workspace-panel workspace-current">
      <header className="workspace-heading">
        <p className="workspace-meta no-print">第 {STEPS.indexOf(step) + 1} 步 / 共 {STEPS.length} 步</p>
        <h1 ref={heading} tabIndex={-1}>{STEP_LABELS[step]}</h1>
        <p className="workspace-meta">上次保存于 {formatDate(props.updatedAt, true)}（北京时间） · 保留至 {formatDate(props.expiresAt)}</p>
      </header>
      {fields.length ? <form className="workspace-stack" noValidate method="post" onSubmit={(event) => { event.preventDefault(); if (next) save(next, true); }}>
        <fieldset disabled={pending} className="workspace-form-fields"><legend className="sr-only">{STEP_LABELS[step]}</legend>
          <AnswerFields step={step} answers={answers} errors={errors} onChange={(key, value) => {
            setAnswers((current) => ({ ...current, [key]: value }));
            setErrors((current) => ({ ...current, [key]: undefined })); changed();
          }} />
        </fieldset>
        {actionBar}
      </form> : <>
        <div inert={pending}>
          {step === "evidence" && <EvidenceChecklist applicationId={id} answers={answers} files={files} notes={notes}
            expiry={formatDate(props.expiresAt)} onChange={(key, value) => { setNotes((current) => ({...current, [key]: value})); changed(); }} />}
          {step === "templates" && <TemplateEditor answers={answers} templates={templates} onChange={(kind, entry) => {
            setTemplates((current) => ({...current, [kind]: entry})); changed();
          }} />}
          {step === "review" && <WorkspaceReview answers={answers} files={files} notes={notes} templates={templates} onEdit={(target, fieldId) => save(target, false, false, fieldId)} />}
          {step === "aftercare" && <Aftercare />}
        </div>
        {actionBar}
      </>}
      <p role="status" className="workspace-meta no-print">{pending ? "正在保存…" : message || (dirty ? "有尚未保存的修改" : "")}</p>
      {conflict && <Button type="button" variant="outline" onClick={() => window.location.reload()}>重新载入最新草稿</Button>}
    </section>
  </div>;
}
