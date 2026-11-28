import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createEvidenceArchive, evidenceArchiveIndex, type ExportFile } from "../lib/workspace/evidence-archive";
import { publishEvidenceArchive } from "../lib/workspace/storage";

function file(id: string, originalId: string | null = null): ExportFile {
  return { id, originalId, originalName: originalId ? "原件.pdf" : null, role: originalId ? "translation" : "original", evidenceKey: "finances",
    name: "银行流水.pdf", size: 3 };
}

test("duplicate upload names stay paired across interleaved originals, translations and a partial selection", () => {
  const { entries, index } = evidenceArchiveIndex([
    file("a"), file("b"), file("c", "b"), file("d", "a"), file("e", "a"), file("f", "not-selected"),
  ]);
  assert.deepEqual(entries.map(({ file, path }) => [file.id, path]), [
    ["a", "01-original.pdf"], ["d", "01-translation-1.pdf"], ["e", "01-translation-2.pdf"],
    ["b", "02-original.pdf"], ["c", "02-translation-1.pdf"], ["f", "03-translation-1.pdf"],
  ]);
  for (const { path } of entries) assert.ok(index.includes(path + "    银行流水.pdf"));
  assert.match(index, /旅行资金 \/ Travel funds/);
  assert.match(index, /原件未勾选 \/ Original not selected    原件.pdf/);
});

test("a full 100 MiB draft streams with an exact Content-Length, one source file at a time", async () => {
  const chunk = new Uint8Array(64 * 1024);
  const files = Array.from({ length: 10 }, (_, i) => ({ ...file(String(i)), size: 10 * 1024 * 1024 }));
  let count = 0;
  let open = 0;
  const archive = createEvidenceArchive(files, async file => {
    assert.equal(++open, 1);
    count++;
    let left = file.size;
    return new Response(new ReadableStream({
      pull(controller) {
        controller.enqueue(chunk);
        left -= chunk.length;
        if (!left) { open--; controller.close(); }
      },
    }));
  }, new AbortController().signal);
  let received = 0;
  for await (const data of archive.body) received += data.byteLength;
  assert.equal(count, 10);
  assert.equal(received, archive.size);
  assert.ok(received > 100 * 1024 * 1024);
});

test("interrupted, missing or truncated evidence fails the entire archive and permits a fresh export", async () => {
  const files = [file("a"), file("b", "a")];
  for (const failure of ["network", "truncated", "missing", "oversized"]) {
    const archive = createEvidenceArchive(files, async file => {
      if (file.id === "a") return new Response("abc");
      if (failure === "network") throw new Error("Connection lost");
      if (failure === "missing") return new Response(null, { status: 404 });
      return new Response(failure === "truncated" ? "ab" : "abcd");
    }, new AbortController().signal);
    await assert.rejects(async () => { for await (const data of archive.body) assert.ok(data.length); });
  }
  const archive = createEvidenceArchive(files, async file => new Response(file.id === "a" ? "abc" : "xyz"),
    new AbortController().signal);
  const chunks = [];
  for await (const data of archive.body) chunks.push(data);
  const bytes = Buffer.concat(chunks);
  assert.equal(bytes.length, archive.size);
  // Inspect the central directory and its referenced local file data, as an extractor would.
  const endOfCentralDirectory = bytes.length - 22;
  let offset = bytes.readUInt32LE(endOfCentralDirectory + 16);
  const unpacked = new Map<string, string>();
  while (bytes.readUInt32LE(offset) === 0x02014b50) {
    const nameLength = bytes.readUInt16LE(offset + 28);
    const name = bytes.toString("utf8", offset + 46, offset + 46 + nameLength);
    const start = bytes.readUInt32LE(offset + 42);
    const payload = start + 30 + bytes.readUInt16LE(start + 26) + bytes.readUInt16LE(start + 28);
    unpacked.set(name, bytes.toString("utf8", payload, payload + bytes.readUInt32LE(offset + 24)));
    offset += 46 + nameLength + bytes.readUInt16LE(offset + 30) + bytes.readUInt16LE(offset + 32);
  }
  assert.equal(unpacked.get("01-original.pdf"), "abc");
  assert.equal(unpacked.get("01-translation-1.pdf"), "xyz");
  assert.ok(unpacked.get("index.txt")?.includes("01-translation-1.pdf    银行流水.pdf"));
});

test("an interrupted storage PUT cancels its active source GET and a retry publishes a complete object", async t => {
  const env = { AWS_ENDPOINT_URL_S3: "https://storage.example", AWS_REGION: "test",
    AWS_ACCESS_KEY_ID: "synthetic", AWS_SECRET_ACCESS_KEY: "synthetic" };
  const previous = { ...process.env };
  Object.assign(process.env, env);
  t.after(() => {
    for (const key of Object.keys(env)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
  let started!: () => void;
  const sourceStarted = new Promise<void>(resolve => { started = resolve; });
  let interrupted = true;
  let cancelled = false;
  const files = [file(randomUUID()), file(randomUUID())];
  t.mock.method(globalThis, "fetch", async (input: Request | string, init?: RequestInit) => {
    if (input instanceof Request && input.method === "GET") {
      if (!interrupted) return new Response("abc");
      started();
      return new Promise<Response>((_, reject) => input.signal.addEventListener("abort", () => {
        cancelled = true;
        reject(new Error("Source cancelled"));
      }, { once: true }));
    }
    assert.equal(init?.method, "PUT");
    if (interrupted) {
      await sourceStarted;
      throw new Error("Upload interrupted");
    }
    const bytes = await new Response(init?.body).arrayBuffer();
    assert.equal(Number(new Headers(init?.headers).get("content-length")), bytes.byteLength);
    return new Response(null, { status: 200 });
  });
  await assert.rejects(publishEvidenceArchive(randomUUID(), files), /Upload interrupted/);
  assert.ok(cancelled);
  interrupted = false;
  await publishEvidenceArchive(randomUUID(), files);
});
