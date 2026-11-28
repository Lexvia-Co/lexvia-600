import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDatabase } from "../lib/neon/database";
import { readExportSelection, reserveEvidenceExport } from "./evidence-export";
import { applications, assistantUsage, documents, storageCleanup } from "../src/db/schema";
import { assistantQuotaKey, authorizeAssistantQuestion, DAILY_ASSISTANT_LIMIT } from "./assistant-usage";
import {
  createApplication, deleteApplication, getApplication, listApplications, renewApplication, saveApplication,
} from "./applications";
import {
  discardPendingUpload, finalizeUpload, inspectDocumentFile, readUpload, removeDocument, reserveUpload, runStorageCleanup,
  updateDocumentDetails, type UploadInput,
} from "./documents";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Set TEST_DATABASE_URL to a dedicated disposable PostgreSQL database.");
process.env.DATABASE_URL = url;
const db = getDatabase();
const owner = "test-" + randomUUID();
const other = "test-" + randomUUID();
const ids = new Set<string>();

before(async () => { await migrate(db, { migrationsFolder: "./migrations" }); });
after(async () => {
  const drafts = await db.select({ id: applications.id }).from(applications).where(eq(applications.ownerId, owner));
  for (const draft of drafts) {
    const files = await db.select({ id: documents.id }).from(documents)
      .where(and(eq(documents.applicationId, draft.id), eq(documents.ownerId, owner)));
    for (const file of files) ids.add(file.id);
    await db.delete(applications).where(and(eq(applications.id, draft.id), eq(applications.ownerId, owner)));
  }
  if (ids.size) await db.delete(storageCleanup).where(inArray(storageCleanup.documentId, [...ids]));
  await db.delete(assistantUsage).where(inArray(assistantUsage.ownerId, [owner, other].map(assistantQuotaKey)));
  await db.$client.end();
});

function upload(extra: Partial<UploadInput> = {}): UploadInput {
  return { id: randomUUID(), kind: "original", evidenceKey: "passport", fileName: "fixture.pdf",
    mediaType: "application/pdf", size: 1024, ...extra };
}

test("assistant quota is atomic across drafts, rolls over daily and excludes foreign or expired drafts", async () => {
  const drafts = await Promise.all([createApplication(owner), createApplication(owner)]);
  assert.equal(await authorizeAssistantQuestion(other, drafts[0], true), "unavailable");
  assert.equal(await authorizeAssistantQuestion(owner, drafts[0], false), "allowed");
  const attempts = await Promise.all(Array.from({ length: DAILY_ASSISTANT_LIMIT + 2 }, (_, i) =>
    authorizeAssistantQuestion(owner, drafts[i % 2], true)));
  assert.equal(attempts.filter(outcome => outcome === "allowed").length, DAILY_ASSISTANT_LIMIT);
  assert.equal(attempts.filter(outcome => outcome === "quota").length, 2);
  const counterScope = eq(assistantUsage.ownerId, assistantQuotaKey(owner));
  await db.update(assistantUsage).set({ day: "2000-01-01" }).where(counterScope);
  assert.equal(await authorizeAssistantQuestion(owner, drafts[1], true), "allowed");
  await db.update(applications).set({ expiresAt: new Date(0) })
    .where(and(eq(applications.id, drafts[1]), eq(applications.ownerId, owner)));
  assert.equal(await authorizeAssistantQuestion(owner, drafts[1], true), "unavailable");
  const [counter] = await db.select().from(assistantUsage).where(counterScope);
  assert.equal(counter.attempts, 1);
});
async function reserve(draftId: string, input = upload()) {
  const record = await reserveUpload(owner, draftId, input);
  ids.add(record.id);
  return record;
}

test("save, resume, revision conflicts and owner isolation", async () => {
  const id = await createApplication(owner, "visit");
  assert.equal(await getApplication(other, id), null);
  assert.deepEqual(await listApplications(other), []);
  await assert.rejects(renewApplication(other, id), { code: "unavailable" });
  await assert.rejects(deleteApplication(other, id), { code: "unavailable" });
  await assert.rejects(saveApplication(other, id, 1, { lastStep: "identity" }), { code: "unavailable" });
  const original = await getApplication(owner, id);
  assert.ok(original);
  assert.equal(original.answers.purpose, "visit");
  const [listed] = await listApplications(owner);
  assert.equal(listed.id, id);
  assert.equal(listed.purpose, "visit");
  assert.equal(listed.arrivalDate, "");
  assert.ok(!Object.hasOwn(listed, "answers"));
  const saves = await Promise.allSettled(["FIRST", "SECOND"].map(givenNames =>
    saveApplication(owner, id, original.revision, { lastStep: "visit", answers: { givenNames } })));
  assert.equal(saves.filter(save => save.status === "fulfilled").length, 1);
  assert.equal(saves.find(save => save.status === "rejected")?.reason.code, "conflict");
  const draft = await getApplication(owner, id);
  assert.ok(draft);
  assert.equal(draft.lastStep, "visit");
  assert.match(draft.answers.givenNames, /^(FIRST|SECOND)$/);
  assert.equal(draft.revision, original.revision + 1);
  const resumed = await renewApplication(owner, id);
  assert.equal(original.lastStep, "identity");
  assert.equal(resumed.lastStep, "visit");
  assert.ok(resumed.expiresAt >= draft.expiresAt);
  assert.equal((await getApplication(owner, id))?.revision, draft.revision);
});

test("deletion racing a successful finalize keeps both object keys queued", async () => {
  const id = await createApplication(owner);
  const file = await reserve(id);
  let notifyStarted!: () => void;
  let releaseWrite!: () => void;
  const started = new Promise<void>(resolve => { notifyStarted = resolve; });
  const pause = new Promise<void>(resolve => { releaseWrite = resolve; });
  const finalizing = finalizeUpload(owner, id, file.id, async () => {
    notifyStarted();
    await pause;
    return "clear";
  });
  await started;
  const deleting = deleteApplication(owner, id);
  releaseWrite();
  await Promise.all([finalizing, deleting]);
  assert.equal(await getApplication(owner, id), null);
  await assert.rejects(renewApplication(owner, id), { code: "unavailable" });
  await assert.rejects(finalizeUpload(owner, id, file.id, async () => assert.fail()), { code: "unavailable" });
  const jobs = await db.select().from(storageCleanup).where(eq(storageCleanup.documentId, file.id));
  assert.deepEqual(jobs.map(job => job.kind).sort(), ["final", "staging"]);
});

test("edited trip preserves inactive evidence notes and customized templates", async () => {
  const id = await createApplication(owner);
  await saveApplication(owner, id, 1, { lastStep: "templates", answers: { purpose: "visit", payer: "host" },
    notes: { invitation: "Synthetic note" }, templates: { invitation: { body: "My original words", fingerprint: "v1" } } });
  await saveApplication(owner, id, 2, { lastStep: "review", answers: { purpose: "holiday", payer: "self" } });
  const persisted = await getApplication(owner, id);
  assert.equal(persisted?.answers.purpose, "holiday");
  assert.equal(persisted?.notes.invitation, "Synthetic note");
  assert.equal(persisted?.templates.invitation?.body, "My original words");
});

test("reviewed English wording follows the source answer and the draft revision", async () => {
  const id = await createApplication(owner);
  await saveApplication(owner, id, 1, { lastStep: "review", answers: { occupation: "教师", travelHistory: "无" } });
  const translation = { text: "Teacher", confirmed: true };
  await saveApplication(owner, id, 2, { lastStep: "review", englishWording: { occupation: translation } });
  await assert.rejects(saveApplication(other, id, 3, { lastStep: "review", englishWording: {} }), { code: "unavailable" });
  await saveApplication(owner, id, 3, { lastStep: "funding", answers: { travelHistory: "日本" } });
  assert.deepEqual((await getApplication(owner, id))?.englishWording.occupation, translation);
  await saveApplication(owner, id, 4, { lastStep: "review", answers: { occupation: "退休教师" } });
  await assert.rejects(saveApplication(owner, id, 4, { lastStep: "review", englishWording: { occupation: translation } }),
    { code: "conflict" });
  assert.deepEqual((await getApplication(owner, id))?.englishWording.occupation, { text: "Teacher", confirmed: false });
});

test("uploads retry safely, reserve quota, pair translations, and revoke access on deletion", async () => {
  const id = await createApplication(owner);
  const input = upload();
  const reservations = await Promise.all([reserve(id, input), reserve(id, input)]);
  const fileId = reservations[0].id;
  assert.equal(fileId, reservations[1].id);
  assert.notEqual(fileId, input.id);
  assert.equal(await readUpload(other, id, fileId), null);
  await assert.rejects(finalizeUpload(other, id, fileId, async () => assert.fail()), { code: "unavailable" });
  await assert.rejects(reserve(id, { ...input, size: 2048 }), { code: "conflict" });
  await assert.rejects(finalizeUpload(owner, id, fileId, async () => { throw new Error("temporary storage failure"); }));
  assert.equal((await getApplication(owner, id))?.documents.length, 0);
  await finalizeUpload(owner, id, fileId, async row => { assert.equal(row.size, input.size); return "secured"; });
  await finalizeUpload(owner, id, fileId, async () => assert.fail("A successful retry need not rewrite bytes"));
  await discardPendingUpload(owner, id, fileId);
  assert.equal((await readUpload(owner, id, fileId))?.state, "ready");
  assert.equal((await readUpload(owner, id, fileId))?.fileInspection, "secured");
  assert.deepEqual((await readUpload(owner, id, fileId))?.expiresAt, (await getApplication(owner, id))?.expiresAt);
  await assert.rejects(reserve(id, upload({ kind: "translation", originalId: fileId, evidenceKey: "trip" })), { code: "unavailable" });
  const translation = await reserve(id, upload({ kind: "translation", originalId: fileId }));
  await finalizeUpload(owner, id, translation.id, async () => "clear");
  await assert.rejects(updateDocumentDetails(owner, id, translation.id, { language: "nonEnglish" }), { code: "invalid" });
  assert.equal((await getApplication(owner, id))?.documents.find(f => f.id === translation.id)?.originalId, fileId);
  await removeDocument(owner, id, fileId);
  assert.equal(await readUpload(owner, id, translation.id), null);
  assert.equal((await getApplication(owner, id))?.documents.length, 0);
  const queued = await db.select().from(storageCleanup).where(inArray(storageCleanup.documentId, [fileId, translation.id]));
  assert.equal(queued.length, 4);
});

test("exports require an owned, unexpired draft and an exact set of ready files", async () => {
  const draft = await createApplication(owner);
  const original = await reserve(draft);
  await finalizeUpload(owner, draft, original.id, async () => "clear");
  const pending = await reserve(draft, upload({ originalId: original.id, kind: "translation" }));
  await assert.rejects(reserveEvidenceExport(other, draft, [original.id]), { code: "unavailable" });
  await assert.rejects(reserveEvidenceExport(owner, draft, [original.id, pending.id]), { code: "unavailable" });
  await assert.rejects(reserveEvidenceExport(owner, await createApplication(owner), [original.id]), { code: "unavailable" });
  await assert.rejects(readExportSelection(owner, draft, [original.id, original.id]), { code: "invalid" });
  await finalizeUpload(owner, draft, pending.id, async () => "clear");
  const [translationOnly] = await readExportSelection(owner, draft, [pending.id]);
  assert.equal(translationOnly.originalName, "fixture.pdf");
  assert.deepEqual((await readExportSelection(owner, draft, [pending.id, original.id])).map(file => file.id),
    [pending.id, original.id]);
  const prepared = await reserveEvidenceExport(owner, draft, [original.id]);
  ids.add(prepared.archiveId);
  assert.deepEqual(prepared.files.map(row => row.id), [original.id]);
  const [cleanup] = await db.select().from(storageCleanup).where(eq(storageCleanup.documentId, prepared.archiveId));
  assert.equal(cleanup.kind, "final");
  assert.ok(cleanup.dueAt.getTime() > Date.now());
  await db.update(applications).set({ expiresAt: new Date(0) }).where(and(eq(applications.id, draft), eq(applications.ownerId, owner)));
  await assert.rejects(readExportSelection(owner, draft, [original.id]), { code: "unavailable" });
});

test("file details are owner-scoped, update independently and preserve draft revision", async () => {
  const id = await createApplication(owner);
  const image = await reserve(id, upload({ fileName: "原件.png", mediaType: "image/png" }));
  const change = { language: "nonEnglish" } as const;
  await assert.rejects(updateDocumentDetails(owner, id, image.id, change), { code: "unavailable" });
  await finalizeUpload(owner, id, image.id, async () => "unknown");
  await assert.rejects(updateDocumentDetails(other, id, image.id, change), { code: "unavailable" });
  await Promise.all([
    updateDocumentDetails(owner, id, image.id, change),
    updateDocumentDetails(owner, id, image.id, { intendedUse: "document" }),
    updateDocumentDetails(owner, id, image.id, { referenceOnly: true }),
  ]);
  const draft = await getApplication(owner, id);
  assert.equal(draft?.revision, 1);
  const stored = draft?.documents.find(doc => doc.id === image.id);
  assert.equal(stored?.language, "nonEnglish");
  assert.equal(stored?.intendedUse, "document");
  assert.equal(stored?.referenceOnly, true);
  await updateDocumentDetails(owner, id, image.id, { referenceOnly: false });
  assert.equal((await readUpload(owner, id, image.id))?.referenceOnly, false);
  await inspectDocumentFile(owner, id, image.id, async () => "clear");
  assert.equal((await readUpload(owner, id, image.id))?.fileInspection, "clear");
});

test("legacy PDF inspection retries transient failures and only inspects an owned ready PDF", async () => {
  const id = await createApplication(owner);
  const file = await reserve(id);
  await finalizeUpload(owner, id, file.id, async () => "unknown");
  assert.equal((await readUpload(owner, id, file.id))?.language, "unknown");
  await assert.rejects(inspectDocumentFile(other, id, file.id, async () => assert.fail()), { code: "unavailable" });
  await assert.rejects(inspectDocumentFile(owner, id, file.id, async () => { throw new Error("Storage unavailable"); }));
  assert.equal((await readUpload(owner, id, file.id))?.fileInspection, "unknown");
  await inspectDocumentFile(owner, id, file.id, async row => { assert.equal(row.id, file.id); return "unreadable"; });
  await inspectDocumentFile(owner, id, file.id, async () => assert.fail("Reuse the verified result"));
  assert.equal((await getApplication(owner, id))?.documents[0]?.fileInspection, "unreadable");
});

test("concurrent reservations respect count and byte limits including pending files", async () => {
  for (const [size, maximum] of [[1, 40], [10 * 1024 * 1024, 10]]) {
    const id = await createApplication(owner);
    for (let i = 0; i < maximum - 1; i++) await reserve(id, upload({ size }));
    const contenders = await Promise.allSettled([reserve(id, upload({ size })), reserve(id, upload({ size }))]);
    assert.equal(contenders.filter(row => row.status === "fulfilled").length, 1);
    assert.equal(contenders.find(row => row.status === "rejected")?.reason.code, "quota");
  }
});

test("expired drafts cannot renew and cleanup retries an interrupted object deletion", async () => {
  const id = await createApplication(owner);
  const file = await reserve(id);
  await db.update(applications).set({ expiresAt: new Date(0) })
    .where(and(eq(applications.id, id), eq(applications.ownerId, owner)));
  assert.equal(await getApplication(owner, id), null);
  await assert.rejects(renewApplication(owner, id), { code: "unavailable" });
  await assert.rejects(finalizeUpload(owner, id, file.id, async () => assert.fail()), { code: "unavailable" });
  const liveDraft = await createApplication(owner);
  const abandoned = await reserve(liveDraft);
  await db.update(documents).set({ createdAt: new Date(0) }).where(and(
    eq(documents.id, abandoned.id), eq(documents.applicationId, liveDraft), eq(documents.ownerId, owner)));
  const interrupted = await runStorageCleanup(async () => { throw new Error("storage offline"); });
  assert.ok(interrupted.expiredDrafts >= 1);
  assert.ok(interrupted.abandonedUploads >= 1);
  assert.equal(await readUpload(owner, liveDraft, abandoned.id), null);
  assert.ok(interrupted.failed >= 1);
  const [job] = await db.select().from(storageCleanup)
    .where(and(eq(storageCleanup.documentId, file.id), eq(storageCleanup.kind, "final")));
  assert.equal(job.attempts, 1);
  await db.update(storageCleanup).set({ dueAt: new Date(0) }).where(eq(storageCleanup.documentId, file.id));
  const removed: string[] = [];
  await runStorageCleanup(async (key, kind) => {
    if (key !== file.id) throw new Error("Unrelated cleanup job");
    removed.push(kind);
  });
  assert.deepEqual(removed.sort(), ["final", "staging"]);
  assert.equal((await db.select().from(storageCleanup).where(eq(storageCleanup.documentId, file.id))).length, 0);
});
