import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getApplication } from "@/data/applications";
import { DraftEditor } from "@/components/workspace/draft-editor";
type GroupedFiles = Record<string, never[]>;
import { STEP_FIELDS, type Step } from "@/lib/workspace/model";

export const metadata = { title: "申请准备工作区 | VBER" };

export default async function DraftPage({ params }: { params: Promise<{id: string; step: string}> }) {
  const { userId } = await auth.protect();
  const {id, step: routeStep} = await params;
  const available: Step[] = ["identity"];
  const step = available.find((value) => value === routeStep);
  if (!step) notFound();
  const draft = await getApplication(userId, id);
  if (!draft) notFound();
  const needsEvidence = step === "evidence" || step === "review";
  const needsTemplates = step === "templates" || step === "review";
  const files: GroupedFiles = {};
  const keys = step === "evidence" ? ["purpose", "payer"] as const : STEP_FIELDS[step];
  const answers = needsTemplates ? draft.answers : Object.fromEntries(keys.map((key) => [key, draft.answers[key]]));
  return <DraftEditor key={id + step} id={id} step={step} revision={draft.revision} initialAnswers={answers}
    initialNotes={needsEvidence ? draft.notes : {}} initialTemplates={needsTemplates ? draft.templates : {}}
    updatedAt={draft.updatedAt.toISOString()} expiresAt={draft.expiresAt.toISOString()} files={files} />;
}
