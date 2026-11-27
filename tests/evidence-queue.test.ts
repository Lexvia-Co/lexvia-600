import assert from "node:assert/strict";
import { test } from "node:test";
import { queueFiles, uploadQueuedFiles, type QueuedFile } from "../components/workspace/evidence-upload-queue";
import { MAX_FILE_BYTES } from "../lib/workspace/storage-policy";

test("a mixed selection keeps good files and attaches the remedy to each rejected file", () => {
  const original = { id: crypto.randomUUID(), name: "邀请信.pdf" };
  const entries = queueFiles([
    new File(["document"], "可用.pdf"),
    new File([new Uint8Array(MAX_FILE_BYTES + 1)], "太大.jpg"),
    new File([], "空文件.pdf"),
    new File(["document"], "其他.docx"),
    new File(["document"], ".隐藏.pdf"),
  ], original);

  assert.deepEqual(entries.map(entry => entry.state), ["ready", "rejected", "rejected", "rejected", "rejected"]);
  for (const entry of entries) assert.deepEqual(entry.original, original);
  assert.equal(new Set(entries.map(entry => entry.requestId)).size, entries.length);
  assert.match(entries[1].message, /压缩/);
  assert.match(entries[2].message, /空/);
  assert.match(entries[3].message, /PDF、JPEG 或 PNG/);
  assert.match(entries[4].message, /文件名/);
});

test("an interrupted file retries its original request ID without resending saved or rejected files", async () => {
  const entries = queueFiles(["first.pdf", "translation.pdf", "other.png", "bad.docx"].map(name => new File(["document"], name)), null);
  let queue = [...entries];
  const attempted: string[] = [];
  let interrupt = true;
  async function upload(entry: QueuedFile) {
    attempted.push(entry.requestId);
    if (entry.file.name === "translation.pdf" && interrupt) throw Error("Acknowledgement interrupted");
    return { ok: true as const };
  }
  const report: Parameters<typeof uploadQueuedFiles>[2] = (id, state, message) => {
    queue = state === "saved" ? queue.filter(item => item.requestId !== id)
      : queue.map(item => item.requestId === id ? { ...item, state, message } : item);
  };
  assert.deepEqual(await uploadQueuedFiles(queue, upload, report), { saved: 2, failed: 1 });
  assert.deepEqual(queue.map(entry => entry.state), ["failed", "rejected"]);
  interrupt = false;
  assert.deepEqual(await uploadQueuedFiles(queue, upload, report), { saved: 1, failed: 0 });
  assert.deepEqual(attempted, [entries[0], entries[1], entries[2], entries[1]].map(entry => entry.requestId));
});

test("a rejected file from the server requests a replacement while a service failure can be retried", async () => {
  const entries = queueFiles(["wrong.pdf", "later.pdf"].map(name => new File(["document"], name)), null);
  const finalStates: string[] = [];
  const result = await uploadQueuedFiles(entries, async entry => ({
    ok: false, message: "文件未保存", retryable: entry.file.name === "later.pdf",
  }), (_id, state) => { if (state !== "uploading") finalStates.push(state); });
  assert.deepEqual(result, { saved: 0, failed: 2 });
  assert.deepEqual(finalStates, ["rejected", "failed"]);
});
