"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  createApplication, deleteApplication, renewApplication, saveApplication,
} from "@/data/applications";
import type { SaveInput, SaveResult } from "@/components/workspace/editor-types";
import {
  EVIDENCE_LABELS, MAX_TEMPLATE_LENGTH, STEP_FIELDS, STEPS, TEMPLATE_LABELS, normalizeAnswers, validateStep,
} from "@/lib/workspace/model";
import { isDocumentId } from "@/lib/workspace/storage-policy";
import { validEnglishWording } from "@/lib/workspace/handoff";
import { isTripPurpose, type TripPurpose } from "@/lib/workspace/draft-start";

const invalid = { ok: false as const, message: "提交的信息有误，请检查后重试。" };

function mutationError(error: unknown, operation: "create" | "resume" | "delete" | "save") {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : "";
  const reason = code === "conflict" || code === "unavailable" ? code : "write_failed";
  console.warn("workspace_mutation_failed", { operation, reason });
  if (code === "conflict") {
    return { ok: false as const, conflict: true, message: "这份草稿在别处更新过。请先复制想保留的内容，再打开最新版。" };
  }
  if (code === "unavailable") {
    return { ok: false as const, message: "这份草稿已过期或无法访问。请返回我的草稿查看。" };
  }
  return { ok: false as const, message: "操作未能完成，请稍后重试。" };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function createDraft(scopeConfirmed: boolean, purpose?: TripPurpose) {
  const { userId } = await auth.protect();
  if (scopeConfirmed !== true || (purpose !== undefined && !isTripPurpose(purpose))) return invalid;
  try {
    const id = await createApplication(userId, purpose);
    revalidatePath("/applications");
    return { ok: true as const, id };
  } catch (error) {
    return mutationError(error, "create");
  }
}

export async function resumeDraft(id: string) {
  const { userId } = await auth.protect();
  if (!isDocumentId(id)) return invalid;
  try {
    const { lastStep } = await renewApplication(userId, id);
    revalidatePath("/applications");
    revalidatePath(`/applications/${id}/${lastStep}`);
    return { ok: true as const, lastStep };
  } catch (error) {
    return mutationError(error, "resume");
  }
}

export async function removeDraft(id: string) {
  const { userId } = await auth.protect();
  if (!isDocumentId(id)) return invalid;
  try {
    await deleteApplication(userId, id);
    revalidatePath("/applications", "layout");
    return { ok: true as const };
  } catch (error) {
    return mutationError(error, "delete");
  }
}

export async function saveDraft(input: SaveInput): Promise<SaveResult> {
  const { userId } = await auth.protect();
  if (!record(input) || !isDocumentId(input.id)
      || !Number.isSafeInteger(input.revision) || input.revision < 0
      || !STEPS.includes(input.step) || !STEPS.includes(input.destination)
      || typeof input.continue !== "boolean") return invalid;
  const { id, step, destination, revision, notes, templates, englishWording } = input;
  if (englishWording !== undefined && (step !== "review" || !validEnglishWording(englishWording))) return invalid;
  const fields = STEP_FIELDS[step];
  let answers = input.answers;
  if (answers !== undefined) {
    if (!record(answers) || !fields.length || Object.entries(answers).some(([key, value]) =>
      !fields.some((field) => field === key) || typeof value !== "string" || value.length > 4000)) return invalid;
    const normalized = normalizeAnswers(answers);
    if (answers.purpose !== undefined && !["", "holiday", "visit"].includes(answers.purpose)) return invalid;
    if (answers.payer !== undefined && !["", "self", "host", "other", "shared"].includes(answers.payer)) return invalid;
    answers = Object.fromEntries(Object.keys(answers).map((key) => [key, normalized[key as keyof typeof normalized]]));
    if (input.continue) {
      const errors = validateStep(step, normalized);
      if (Object.keys(errors).length) return { ok: false, message: "请检查标出的信息后继续。", errors };
    }
  } else if (fields.length && input.continue) return invalid;
  if (notes !== undefined && (step !== "evidence" || !record(notes) ||
      Object.entries(notes).some(([key, note]) =>
        !Object.hasOwn(EVIDENCE_LABELS, key) || typeof note !== "string" || note.length > 4000))) return invalid;
  if (templates !== undefined && (step !== "templates" || !record(templates) ||
      Object.entries(templates).some(([key, value]) =>
        !Object.hasOwn(TEMPLATE_LABELS, key) || !record(value) ||
        typeof value.body !== "string" || value.body.length > MAX_TEMPLATE_LENGTH ||
        typeof value.fingerprint !== "string" || value.fingerprint.length > 128 ||
        Object.keys(value).some((part) => part !== "body" && part !== "fingerprint")))) return invalid;
  try {
    const saved = await saveApplication(userId, id, revision, { lastStep: destination, answers, notes, templates, englishWording });
    revalidatePath("/applications");
    revalidatePath(`/applications/${id}/${step}`);
    if (destination !== step) revalidatePath(`/applications/${id}/${destination}`);
    return { ok: true, revision: saved.revision, updatedAt: saved.updatedAt.toISOString(), expiresAt: saved.expiresAt.toISOString() };
  } catch (error) {
    return mutationError(error, "save");
  }
}
