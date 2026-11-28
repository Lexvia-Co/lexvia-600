import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PDFDocument, PDFName, PDFRef } from "pdf-lib";
import { documentIssues, isReferenceFile } from "../lib/workspace/document-checks";
import { inspectPdf } from "../lib/workspace/pdf-inspection";
import { inspectFile } from "../lib/workspace/storage";
import sharp from "sharp";
import type { EvidenceFile } from "../lib/workspace/storage-policy";

function original(id: string, fields: Partial<EvidenceFile> = {}): EvidenceFile {
  return {
    id, name: "材料.pdf", size: 72_000, role: "original", originalId: null,
    intendedUse: "document", language: "english", fileInspection: "clear",
    referenceOnly: false, downloadUrl: "/", ...fields,
  };
}

function codes(file: EvidenceFile, files = [file]) {
  return documentIssues(file, files).map(issue => issue.code);
}

test("document size checks use the ImmiAccount limit for originals, scans and translations", () => {
  const ordinary = original("statement", { size: 5_000_000 });
  assert.deepEqual(codes(ordinary), []);
  assert.deepEqual(codes({ ...ordinary, size: 5_000_001 }), ["documentSize"]);
  assert.deepEqual(codes({ ...ordinary, name: "银行流水.jpg", size: 8_000_000 }), ["documentSize"]);
  assert.deepEqual(codes({ ...ordinary, name: "译本.png", size: 5_000_001, role: "translation",
    intendedUse: "unknown", language: "unknown", originalId: "another" }), ["documentSize"]);
});

test("a portrait uses the photograph limits and JPEG format only after confirming its use", () => {
  const portrait = original("photo", { name: "证件照.jpeg", intendedUse: "portrait", language: "unknown" });
  for (const size of [70_000, 3_500_000]) assert.deepEqual(codes({ ...portrait, size }), []);
  for (const size of [69_999, 3_500_001]) assert.deepEqual(codes({ ...portrait, size }), ["portraitSize"]);
  assert.deepEqual(codes({ ...portrait, name: "证件照.png" }), ["portraitFormat"]);
  assert.deepEqual(codes({ ...portrait, intendedUse: "unknown" }), ["useUnknown"]);
  assert.deepEqual(codes({ ...portrait, intendedUse: "document" }), ["languageUnknown"]);
});

test("translation checks bind to the individual non-English original independent of filenames", () => {
  const first = original("a", { language: "nonEnglish" });
  const second = original("b", { language: "nonEnglish" });
  const translated = original("t", { role: "translation", originalId: second.id });
  const group = [first, second, translated];
  assert.deepEqual(codes(first, group), ["translationMissing"]);
  assert.deepEqual(codes(second, group), []);
  assert.deepEqual(codes(translated, group), []);
  assert.deepEqual(codes(original("english"), group), []);
  assert.deepEqual(codes({ ...first, language: "unknown" }, group), ["languageUnknown"]);
});

test("reference originals and their translations are excluded, and a retained translation cannot satisfy its original", () => {
  const source = original("a", { language: "nonEnglish", size: 8_000_000 });
  const translation = original("translation", { role: "translation", originalId: source.id, fileInspection: "secured" });
  const retained = { ...source, referenceOnly: true };
  assert.deepEqual(codes(retained, [retained, translation]), []);
  assert.equal(isReferenceFile(translation, [retained, translation]), true);
  assert.deepEqual(codes(translation, [retained, translation]), []);
  assert.deepEqual(codes(source, [source, { ...translation, referenceOnly: true }]), ["documentSize", "translationMissing"]);
  assert.deepEqual(codes(source, [source, translation]), ["documentSize"]);
  assert.deepEqual(codes(translation, [source, translation]), ["pdfSecured"]);
});

test("unchecked, unreadable and secured PDFs remain actionable", () => {
  assert.deepEqual(codes(original("old", { language: "unknown", fileInspection: "unknown" })), ["languageUnknown", "pdfUnknown"]);
  assert.deepEqual(codes(original("damaged", { fileInspection: "unreadable" })), ["pdfUnreadable"]);
  assert.deepEqual(codes(original("locked", { fileInspection: "secured" })), ["pdfSecured"]);
});

test("image checks decode JPEG and PNG data and keep unreadable or older scans actionable", async () => {
  const sample = sharp({ create: { width: 8, height: 8, channels: 3, background: "white" } });
  const png = await sample.clone().png().toBuffer();
  assert.equal(await inspectFile(png, "image/png"), "clear");
  assert.equal(await inspectFile(await sample.clone().jpeg().toBuffer(), "image/jpeg"), "clear");
  // Keep the PNG signature, header and terminator but remove the image data.
  const missingPixels = Buffer.concat([png.subarray(0, 33), png.subarray(-12)]);
  assert.equal(await inspectFile(missingPixels, "image/png"), "unreadable");
  const scan = original("scan", { name: "scan.png", fileInspection: "unreadable" });
  assert.deepEqual(codes(scan), ["imageUnreadable"]);
  assert.deepEqual(codes({ ...scan, fileInspection: "unknown" }), ["imageUnknown"]);
});

test("PDF inspection reads the catalog and encryption dictionary, including owner-only protection", async () => {
  const clear = await PDFDocument.create();
  const page = clear.addPage();
  page.drawRectangle({ x: 20, y: 20, width: 40, height: 40 });
  clear.setTitle("Example of the literal word /Encrypt in a PDF");
  for (const useObjectStreams of [false, true]) {
    assert.equal(await inspectPdf(await clear.save({ useObjectStreams })), "clear");
  }
  // Single-page synthetic Quartz PDFs with an owner password. The second also requires an open password.
  for (const fixture of ["owner-protected.pdf", "password-protected.pdf"]) {
    assert.equal(await inspectPdf(await readFile(new URL(`./fixtures/${fixture}`, import.meta.url))), "secured");
  }
  page.node.set(PDFName.of("Contents"), PDFRef.of(999));
  assert.equal(await inspectPdf(await clear.save()), "unreadable");
  assert.equal(await inspectPdf(Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF")), "unreadable");
});
