import "server-only";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { getDatabase } from "../lib/neon/database";
import { emptyAnswers, GUIDE_VERSION, normalizeAnswers, type Answers, type Step, type TemplateKind } from "../lib/workspace/model";
import type { TripPurpose } from "../lib/workspace/draft-start";
import { invalidateChangedWording, type EnglishWording } from "../lib/workspace/handoff";
import { applicantDetails, applications, documents, evidenceItems, type SavedTemplate } from "../src/db/schema";
import { discardApplication, lockApplication, newExpiry, ownedDraft, validId, WorkspaceError } from "./workspace-state";
export { WorkspaceError } from "./workspace-state";

const summary = {
  id: applications.id, revision: applications.revision, lastStep: applications.lastStep,
  createdAt: applications.createdAt, updatedAt: applications.updatedAt, expiresAt: applications.expiresAt,
  guideVersion: applications.guideVersion,
};
const fileSummary = {
  id: documents.id, evidenceKey: documents.evidenceKey, kind: documents.kind, originalId: documents.originalId,
  fileName: documents.fileName, mediaType: documents.mediaType, size: documents.size, createdAt: documents.createdAt,
  intendedUse: documents.intendedUse, language: documents.language, fileInspection: documents.fileInspection,
  referenceOnly: documents.referenceOnly,
};

export async function listApplications(ownerId: string) {
  const rows = await getDatabase().select({
    ...summary, answers: applicantDetails.answers,
  }).from(applications)
    .leftJoin(applicantDetails, and(eq(applicantDetails.applicationId, applications.id),
      eq(applicantDetails.ownerId, applications.ownerId)))
    .where(and(eq(applications.ownerId, ownerId), gt(applications.expiresAt, new Date())))
    .orderBy(desc(applications.updatedAt));
  return rows.map(({ answers, ...draft }) => ({
    ...draft,
    purpose: answers?.purpose ?? "",
    arrivalDate: answers?.arrivalDate ?? "",
    departureDate: answers?.departureDate ?? "",
  }));
}

export async function getApplication(ownerId: string, id: string) {
  if (!validId(id)) return null;
  return getDatabase().transaction(async tx => {
    const [draft] = await tx.select({ ...summary, templates: applications.templates }).from(applications)
      .where(and(ownedDraft(ownerId, id), gt(applications.expiresAt, new Date()))).for("share");
    if (!draft || draft.expiresAt.getTime() <= Date.now()) return null;
    const [details] = await tx.select({ answers: applicantDetails.answers, englishWording: applicantDetails.englishWording }).from(applicantDetails)
      .where(and(eq(applicantDetails.applicationId, id), eq(applicantDetails.ownerId, ownerId)));
    const items = await tx.select({ key: evidenceItems.evidenceKey, note: evidenceItems.note }).from(evidenceItems)
      .where(and(eq(evidenceItems.applicationId, id), eq(evidenceItems.ownerId, ownerId)));
    const files = await tx.select(fileSummary).from(documents).where(and(eq(documents.applicationId, id),
      eq(documents.ownerId, ownerId), eq(documents.state, "ready"))).orderBy(asc(documents.createdAt));
    return { ...draft, answers: normalizeAnswers(details?.answers), englishWording: details?.englishWording ?? {}, documents: files,
      notes: Object.fromEntries(items.map(item => [item.key, item.note])) as Record<string, string> };
  });
}
export type ApplicationDetail = NonNullable<Awaited<ReturnType<typeof getApplication>>>;
export type ApplicationSummary = Awaited<ReturnType<typeof listApplications>>[number];

export async function createApplication(ownerId: string, purpose: TripPurpose | "" = "") {
  return getDatabase().transaction(async tx => {
    const [row] = await tx.insert(applications).values({ ownerId, guideVersion: GUIDE_VERSION,
      expiresAt: newExpiry(new Date()) }).returning({ id: applications.id });
    await tx.insert(applicantDetails).values({ ownerId, applicationId: row.id, answers: { ...emptyAnswers(), purpose } });
    return row.id;
  });
}

export interface ApplicationChanges {
  lastStep: Step;
  answers?: Partial<Answers>;
  englishWording?: EnglishWording;
  notes?: Record<string, string>;
  templates?: Partial<Record<TemplateKind, SavedTemplate>>;
}

export async function saveApplication(ownerId: string, id: string, revision: number, changes: ApplicationChanges) {
  return getDatabase().transaction(async tx => {
    const draft = await lockApplication(tx, ownerId, id);
    if (draft.revision !== revision) throw new WorkspaceError("conflict");
    if (changes.answers || changes.englishWording) {
      const scope = and(eq(applicantDetails.applicationId, id), eq(applicantDetails.ownerId, ownerId));
      const [old] = await tx.select({ answers: applicantDetails.answers, englishWording: applicantDetails.englishWording })
        .from(applicantDetails).where(scope);
      if (!old) throw new WorkspaceError("unavailable");
      const answers = normalizeAnswers({ ...old.answers, ...changes.answers });
      const englishWording = invalidateChangedWording({ ...old.englishWording, ...changes.englishWording }, old.answers, answers);
      await tx.update(applicantDetails).set({ answers, englishWording }).where(scope);
    }
    for (const [evidenceKey, note] of Object.entries(changes.notes ?? {})) {
      await tx.insert(evidenceItems).values({ ownerId, applicationId: id, evidenceKey, note })
        .onConflictDoUpdate({ target: [evidenceItems.applicationId, evidenceItems.evidenceKey], set: { note },
          setWhere: eq(evidenceItems.ownerId, ownerId) });
    }
    const now = new Date();
    const [changed] = await tx.update(applications).set({
      lastStep: changes.lastStep, templates: { ...draft.templates, ...changes.templates },
      revision: revision + 1, updatedAt: now, expiresAt: newExpiry(now),
    }).where(ownedDraft(ownerId, id)).returning(summary);
    return changed;
  });
}

export async function renewApplication(ownerId: string, id: string) {
  return getDatabase().transaction(async tx => {
    await lockApplication(tx, ownerId, id);
    const [resumed] = await tx.update(applications).set({ expiresAt: newExpiry(new Date()) })
      .where(ownedDraft(ownerId, id))
      .returning({ lastStep: applications.lastStep, expiresAt: applications.expiresAt });
    return resumed;
  });
}

export async function deleteApplication(ownerId: string, id: string) {
  return getDatabase().transaction(async tx => {
    await lockApplication(tx, ownerId, id);
    await discardApplication(tx, ownerId, id);
  });
}
