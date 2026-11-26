import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDatabase } from "../lib/neon/database";
import { applications, documents, storageCleanup } from "../src/db/schema";
import {
  createApplication, deleteApplication, getApplication, listApplications, renewApplication, saveApplication,
} from "./applications";
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
  await db.$client.end();
});

test("save, resume, revision conflicts and owner isolation", async () => {
  const id = await createApplication(owner);
  assert.equal(await getApplication(other, id), null);
  assert.deepEqual(await listApplications(other), []);
  await assert.rejects(renewApplication(other, id), { code: "unavailable" });
  await assert.rejects(deleteApplication(other, id), { code: "unavailable" });
  await assert.rejects(saveApplication(other, id, 1, { lastStep: "identity" }), { code: "unavailable" });
  const original = await getApplication(owner, id);
  assert.ok(original);
  const saves = await Promise.allSettled(["FIRST", "SECOND"].map(givenNames =>
    saveApplication(owner, id, original.revision, { lastStep: "visit", answers: { givenNames } })));
  assert.equal(saves.filter(save => save.status === "fulfilled").length, 1);
  assert.equal(saves.find(save => save.status === "rejected")?.reason.code, "conflict");
  const draft = await getApplication(owner, id);
  assert.ok(draft);
  assert.equal(draft.lastStep, "visit");
  assert.match(draft.answers.givenNames, /^(FIRST|SECOND)$/);
  assert.equal(draft.revision, original.revision + 1);
  assert.ok(await renewApplication(owner, id) >= draft.expiresAt);
  assert.equal((await getApplication(owner, id))?.revision, draft.revision);
});
