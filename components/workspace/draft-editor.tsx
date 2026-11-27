"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { StepProgress } from "@/lib/workspace/step-progress";
import { saveDraft } from "@/app/applications/actions";
import { EVIDENCE_LABELS, STEP_FIELDS, STEP_LABELS, STEPS, TEMPLATE_LABELS, normalizeAnswers, type Answers, type Step } from "@/lib/workspace/model";
import { AnswerFields } from "./answer-fields";
import { EvidenceChecklist, type FileQueueState, type GroupedFiles } from "./evidence-checklist";
import { TemplateEditor } from "./template-editor";
import { Aftercare, WorkspaceReview } from "./workspace-review";
import { formatDate, type AnswerErrors, type SavedTemplates } from "./editor-types";

type Props = {
  id: string; revision: number; step: Step; initialAnswers: Partial<Answers>;
  initialNotes: Record<string, string>; initialTemplates: SavedTemplates;
  files: GroupedFiles; updatedAt: string; expiresAt: string; progress: StepProgress;
};

type SaveOptions = { advance?: boolean; close?: boolean; focus?: string; editFromReview?: boolean };

function reviewTarget(step: Step, target: string | null) {
  if (!target) return;
  if (STEP_FIELDS[step].some(key => key === target)) return target;
  if (step === "evidence" && (target === step ||
    target.startsWith("evidence-") && Object.hasOwn(EVIDENCE_LABELS, target.slice("evidence-".length)))) return target;
  if (step === "templates" && (target === step || Object.hasOwn(TEMPLATE_LABELS, target))) return target;
}

export function DraftEditor(props: Props) {
  const { id, step, files } = props;
  const router = useRouter();
  const returnTarget = reviewTarget(step, useSearchParams().get("review"));
  const [answers, setAnswers] = useState(() => normalizeAnswers(props.initialAnswers));
  const [notes, setNotes] = useState(props.initialNotes);
  const [templates, setTemplates] = useState(props.initialTemplates);
  const [revision, setRevision] = useState(props.revision);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false);
  const [errors, setErrors] = useState<AnswerErrors>({});
  const [pending, start] = useTransition();
  const [stepsOpen, setStepsOpen] = useState(false);
  const [fileQueues, setFileQueues] = useState<Record<string, FileQueueState>>({});
  const fileQueueChanged = useCallback((key: string, state: FileQueueState) => {
    setFileQueues(previous => previous[key] === state ? previous : { ...previous, [key]: state });
  }, []);
  const uploading = Object.values(fileQueues).includes("uploading");
  const hasQueuedFiles = uploading || Object.values(fileQueues).includes("pending");
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
    if (!dirty && !hasQueuedFiles) return;
    function onLeave(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty, hasQueuedFiles]);

  const canLeaveQueue = useCallback(() => {
    if (uploading) {
      setMessage("文件正在上传。请等上传结束后再离开。");
      return false;
    }
    return !hasQueuedFiles || window.confirm("还有文件没上传。离开后需要重新选择这些文件。要离开吗？");
  }, [hasQueuedFiles, uploading]);

  useEffect(() => {
    if (!hasQueuedFiles && !dirty) return;
    function checkLink(event: MouseEvent) {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.origin !== location.origin || link.target === "_blank" || link.hasAttribute("download")) return;
      if (link.hash && link.pathname === location.pathname && link.search === location.search) return;
      if (!canLeaveQueue() || (dirty && !window.confirm("还有修改没保存。要离开这一页吗？"))) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    document.addEventListener("click", checkLink, true);
    return () => document.removeEventListener("click", checkLink, true);
  }, [canLeaveQueue, dirty, hasQueuedFiles]);

  function changed() { setDirty(true); setMessage(""); }
  function save(destination: Step, { advance = false, close, focus, editFromReview }: SaveOptions = {}) {
    if (pending || conflict) return;
    if ((destination !== step || close) && !canLeaveQueue()) return;
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
        else if (destination !== step) {
          const query = editFromReview ? "?review=" + encodeURIComponent(focus ?? destination) : "";
          const hash = focus ? "#" + encodeURIComponent(focus) : "";
          router.push(`/applications/${id}/${destination}${query}${hash}`);
        }
      } catch { setMessage("暂时无法确认是否保存成功。请留在这一页，检查网络后再试。"); }
    });
  }
  function dashboard() {
    if (dirty) save(step, { close: true });
    else if (canLeaveQueue()) router.push("/applications");
  }
  function continueEditing() {
    if (returnTarget) save("review", { focus: "review-" + returnTarget });
    else if (next) save(next, { advance: true });
  }
  const actionBar = <div className="workspace-actions workspace-step-actions no-print">
    {!finalStep && <Button type="button" variant="outline" disabled={pending || conflict} onClick={() => save(step)}>保存草稿</Button>}
    {next && <Button type={fields.length ? "submit" : "button"} disabled={pending || conflict}
      onClick={fields.length ? undefined : continueEditing}>{returnTarget ? "保存并返回核对" : "保存并继续"}</Button>}
    {finalStep && <Button type="button" variant="outline" onClick={dashboard}>返回我的草稿</Button>}
  </div>;
  return <div className="workspace-editor">
    <aside className="workspace-sidebar no-print">
      <Button type="button" variant="ghost" disabled={pending} onClick={dashboard}>← 我的草稿</Button>
      <nav aria-label="申请准备步骤"><Collapsible open={stepsOpen} onOpenChange={setStepsOpen}>
        <CollapsibleTrigger asChild><Button type="button" variant="outline" size="sm" className="step-list-trigger">
          {stepsOpen ? "收起步骤" : "查看全部步骤"}
        </Button></CollapsibleTrigger>
        <CollapsibleContent forceMount className="step-list-content"><ol>{STEPS.map((item, index) => <li key={item}>
        <Button type="button" variant={item === step ? "secondary" : "ghost"} className="step-link"
          disabled={pending || conflict} aria-current={item === step ? "step" : undefined}
          onClick={() => { if (item !== step) save(item); }}>
          <span aria-hidden="true">{index + 1}</span><span>{STEP_LABELS[item]}</span>
          {(item === "identity" || item === "visit" || item === "funding") &&
            <small>{props.progress[item]}</small>}
          {item === "templates" && <small>选填</small>}
        </Button>
      </li>)}</ol></CollapsibleContent></Collapsible></nav>
    </aside>
    <section className="workspace-panel workspace-current">
      <header className="workspace-heading">
        <p className="workspace-meta no-print">第 {STEPS.indexOf(step) + 1} 步 / 共 {STEPS.length} 步</p>
        <h1 ref={heading} tabIndex={-1}>{STEP_LABELS[step]}</h1>
        <p className="workspace-meta">上次保存于 {formatDate(props.updatedAt, true)}（北京时间） · 保留至 {formatDate(props.expiresAt)}</p>
      </header>
      {fields.length ? <form className="workspace-stack" noValidate method="post" onSubmit={(event) => { event.preventDefault(); continueEditing(); }}>
        <fieldset disabled={pending} className="workspace-form-fields"><legend className="sr-only">{STEP_LABELS[step]}</legend>
          <AnswerFields step={step} answers={answers} errors={errors} onChange={(key, value) => {
            setAnswers((current) => ({ ...current, [key]: value }));
            setErrors((current) => ({ ...current, [key]: undefined })); changed();
          }} />
        </fieldset>
        {actionBar}
      </form> : <>
        <div inert={pending}>
          {step === "evidence" && <EvidenceChecklist applicationId={id} answers={answers} files={files} notes={notes} onFileQueueChange={fileQueueChanged}
            expiry={formatDate(props.expiresAt)} onChange={(key, value) => { setNotes((current) => ({...current, [key]: value})); changed(); }} />}
          {step === "templates" && <TemplateEditor answers={answers} templates={templates} onChange={(kind, entry) => {
            setTemplates((current) => ({...current, [kind]: entry})); changed();
          }} />}
          {step === "review" && <WorkspaceReview answers={answers} files={files} notes={notes} templates={templates}
            onEdit={(target, focus) => save(target, { focus, editFromReview: true })} />}
          {step === "aftercare" && <Aftercare />}
        </div>
        {actionBar}
      </>}
      <p role="status" className="workspace-meta no-print">{pending ? "正在保存…" : message || (dirty ? "有尚未保存的修改" : "")}</p>
      {conflict && <Button type="button" variant="outline" onClick={() => window.location.reload()}>重新载入最新草稿</Button>}
    </section>
  </div>;
}
