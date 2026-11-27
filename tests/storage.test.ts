import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import cleanup from "../functions/cleanup";
import { identifyFile, readExactBytes, recordFileFailure, signDownload, signUpload, verifyAndPublish } from "../lib/workspace/storage";
import { MAX_FILE_BYTES, validFileName, validFileSize } from "../lib/workspace/storage-policy";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jPZsAAAAASUVORK5CYII=", "base64");
const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n");
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x02, 0xff, 0xd9]);

test("supported names, size boundaries, and identifiable file bytes", () => {
  assert.equal(validFileName("户口本（英文）.PDF"), true);
  for (const name of ["../abc.pdf", "a\u0000.pdf", "abc\u202e.pdf", "file.exe", "\ud800.pdf", ""]) {
    assert.equal(validFileName(name), false);
  }
  for (const n of [0, -1, 1.5, Infinity, NaN, MAX_FILE_BYTES + 1]) assert.equal(validFileSize(n), false);
  assert.equal(validFileSize(MAX_FILE_BYTES), true);
  assert.equal(identifyFile(pdf), "application/pdf");
  assert.equal(identifyFile(png), "image/png");
  assert.equal(identifyFile(jpeg), "image/jpeg");
  for (const bytes of [pdf, png, jpeg]) assert.equal(identifyFile(bytes.subarray(0, -3)), undefined);
});

test("downloaded byte count is bounded even when Content-Length is absent or wrong", async () => {
  const stream = () => new ReadableStream({ start(controller) {
    controller.enqueue(Uint8Array.of(1)); controller.enqueue(Uint8Array.of(2)); controller.close();
  } });
  assert.deepEqual(await readExactBytes(new Response(stream()), 2), Uint8Array.of(1, 2));
  await assert.rejects(readExactBytes(new Response(stream()), 1));
  await assert.rejects(readExactBytes(new Response(stream()), 3));
  await assert.rejects(readExactBytes(new Response(stream(), { headers: { "content-length": "9" } }), 2));
});

test("reserve a bounded staging PUT, then publish only server-checked bytes", async t => {
  // This test signs only against a fake host using disposable credentials.
  const env = {
    AWS_ENDPOINT_URL_S3: "https://bucket.example", AWS_ACCESS_KEY_ID: "test-key",
    AWS_SECRET_ACCESS_KEY: "test-secret", AWS_REGION: "us-east-2",
  };
  const oldEnv = { ...process.env };
  Object.assign(process.env, env);
  t.after(() => { for (const key of Object.keys(env)) {
    if (oldEnv[key] === undefined) delete process.env[key]; else process.env[key] = oldEnv[key];
  } });
  const id = randomUUID();
  const url = new URL(await signUpload(id, pdf.length));
  assert.equal(url.pathname, `/assets/workspace/staging/${id}`);
  assert.equal(url.searchParams.get("X-Amz-Expires"), "300");
  assert.match(url.searchParams.get("X-Amz-SignedHeaders") ?? "", /content-length/);
  assert.equal(new URL(await signDownload(id)).searchParams.get("X-Amz-Expires"), "60");
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (request: Request) => {
    calls.push(`${request.method} ${new URL(request.url).pathname}`);
    if (request.method === "GET") return new Response(pdf);
    assert.equal(request.headers.get("content-length"), String(pdf.byteLength));
    assert.deepEqual(Buffer.from(await request.arrayBuffer()), pdf);
    assert.equal(request.headers.get("content-type"), "application/pdf");
    assert.match(request.headers.get("content-disposition") ?? "", /^attachment;/);
    return new Response(null, { status: 200 });
  });
  await verifyAndPublish({ id, size: pdf.length, fileName: "邀请信.pdf", mediaType: "application/pdf" });
  assert.deepEqual(calls, [`GET /assets/workspace/staging/${id}`, `PUT /assets/workspace/final/${id}`]);
  await assert.rejects(verifyAndPublish({ id, size: pdf.length, fileName: "改名.png", mediaType: "image/png" }));
  assert.equal(calls.filter(call => call.startsWith("PUT")).length, 1);
});

test("scheduled cleanup refuses ordinary HTTP calls before opening Postgres", async () => {
  const url = "https://cleanup.example/";
  assert.equal((await cleanup(new Request(url))).status, 405);
  assert.equal((await cleanup(new Request(url, { method: "POST", body: "{}" }))).status, 403);
});

test("file failures only emit operation and category and throttle repeated events", t => {
  let now = 1_000;
  t.mock.method(Date, "now", () => now);
  const warnings = t.mock.method(console, "warn", () => {});
  recordFileFailure("finalize", "file_contents");
  recordFileFailure("finalize", "file_contents");
  recordFileFailure("finalize", "service");
  now += 300_000;
  recordFileFailure("finalize", "file_contents");
  assert.deepEqual(warnings.mock.calls.map(call => call.arguments), [
    ["workspace.file.failure", { operation: "finalize", category: "file_contents" }],
    ["workspace.file.failure", { operation: "finalize", category: "service" }],
    ["workspace.file.failure", { operation: "finalize", category: "file_contents" }],
  ]);
});
