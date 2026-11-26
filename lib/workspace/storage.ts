import "server-only";
import { createHash } from "node:crypto";
import { AwsClient } from "aws4fetch";
import type { ErrorCode } from "@/data/workspace-state";
import {
  DOWNLOAD_URL_SECONDS, UPLOAD_URL_SECONDS, isDocumentId, validFileName, validFileSize,
  type DocumentMedia, type DocumentRole, type EvidenceFile,
} from "./storage-policy";

type ObjectKind = "staging" | "final";

export class InvalidUpload extends Error {}

export type FileOperation = "reserve" | "finalize" | "discard_pending" | "remove";
type FailureCategory = ErrorCode | "file_contents" | "service";
const lastFailureEvents = new Map<string, number>();

export function recordFileFailure(operation: FileOperation, category: FailureCategory) {
  // One event per fixed operation/category pair every five minutes per app instance.
  const key = operation + "/" + category;
  const now = Date.now();
  const previous = lastFailureEvents.get(key);
  if (previous !== undefined && now - previous < 300_000) return;
  lastFailureEvents.set(key, now);
  console.warn("workspace.file.failure", { operation, category });
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error("Storage is unavailable");
  return value;
}

function storageClient() {
  return new AwsClient({
    accessKeyId: required("AWS_ACCESS_KEY_ID"),
    secretAccessKey: required("AWS_SECRET_ACCESS_KEY"),
    sessionToken: process.env.AWS_SESSION_TOKEN,
    region: required("AWS_REGION"),
    service: "s3",
    retries: 0,
  });
}

function objectUrl(id: string, kind: ObjectKind) {
  if (!isDocumentId(id)) throw new InvalidUpload();
  return new URL(`/assets/workspace/${kind}/${id}`, required("AWS_ENDPOINT_URL_S3"));
}

export async function signUpload(id: string, size: number, seconds = UPLOAD_URL_SECONDS) {
  if (!validFileSize(size) || seconds < 1 || seconds > UPLOAD_URL_SECONDS) throw new InvalidUpload();
  const url = objectUrl(id, "staging");
  url.searchParams.set("X-Amz-Expires", String(seconds));
  // Browsers send Content-Length themselves for a Blob. Sign it to bind the PUT to the reservation.
  const signed = await storageClient().sign(url, {
    method: "PUT",
    headers: { "content-length": String(size) },
    aws: { signQuery: true, allHeaders: true },
  });
  return signed.url;
}

export async function signDownload(id: string, seconds = DOWNLOAD_URL_SECONDS) {
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > DOWNLOAD_URL_SECONDS) throw new InvalidUpload();
  const url = objectUrl(id, "final");
  url.searchParams.set("X-Amz-Expires", String(seconds));
  return (await storageClient().sign(url, { method: "GET", aws: { signQuery: true } })).url;
}

export function buildEvidenceFile(
  doc: { id: string; fileName: string; size: number; kind: DocumentRole; originalId: string | null }, applicationId: string,
): EvidenceFile {
  return {
    id: doc.id, name: doc.fileName, size: doc.size, role: doc.kind, originalId: doc.originalId,
    downloadUrl: `/applications/${applicationId}/files/${doc.id}`,
  };
}

async function objectRequest(id: string, kind: ObjectKind, method: string, bytes?: Uint8Array<ArrayBuffer>, headers?: HeadersInit) {
  return storageClient().fetch(objectUrl(id, kind), {
    method,
    body: bytes,
    headers: {
      ...headers,
      "x-amz-content-sha256": createHash("sha256").update(bytes ?? "").digest("hex"),
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(25_000),
  });
}

export async function removeObject(id: string, kind: ObjectKind) {
  const response = await objectRequest(id, kind, "DELETE");
  if (!response.ok && response.status !== 404) throw new Error("Storage deletion failed");
}

export async function readExactBytes(response: Response, size: number) {
  const reader = response.body?.getReader();
  if (!reader || !validFileSize(size)) throw new InvalidUpload();
  const length = response.headers.get("content-length");
  if (length !== null && Number(length) !== size) {
    await reader.cancel();
    throw new InvalidUpload();
  }
  const bytes = new Uint8Array(size);
  let count = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (count + value.byteLength > size) {
        await reader.cancel();
        throw new InvalidUpload();
      }
      bytes.set(value, count);
      count += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  if (count !== size) throw new InvalidUpload();
  return bytes;
}

export function identifyFile(bytes: Uint8Array): DocumentMedia | undefined {
  const file = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (/^%PDF-\d\.\d/.test(file.toString("ascii", 0, 8))
    && /%%EOF\s*$/.test(file.toString("latin1", Math.max(0, file.length - 1024)))) return "application/pdf";
  if (file.length >= 4 && file.readUInt16BE(0) === 0xffd8 && file[2] === 0xff
    && file.readUInt16BE(file.length - 2) === 0xffd9) return "image/jpeg";
  if (file.length >= 45 && file.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
    && file.readUInt32BE(8) === 13 && file.toString("ascii", 12, 16) === "IHDR"
    && file.subarray(-12).equals(Buffer.from("0000000049454e44ae426082", "hex"))) return "image/png";
}

export async function verifyAndPublish(doc: { id: string; size: number; mediaType: string; fileName: string }) {
  if (!validFileName(doc.fileName) || !validFileSize(doc.size)) throw new InvalidUpload();
  const staged = await objectRequest(doc.id, "staging", "GET");
  if (staged.status === 404) throw new InvalidUpload();
  if (!staged.ok) throw new Error("Storage read failed");
  const bytes = await readExactBytes(staged, doc.size);
  const actualType = identifyFile(bytes);
  if (!actualType || actualType !== doc.mediaType) throw new InvalidUpload();
  // Publish this exact verified snapshot. A replayed staging PUT cannot alter the final file.
  const encodedName = encodeURIComponent(doc.fileName).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16)}`);
  const published = await objectRequest(doc.id, "final", "PUT", bytes, {
    "content-type": actualType,
    "content-disposition": `attachment; filename="document.${actualType === "image/jpeg" ? "jpg" : actualType.split("/")[1]}"; filename*=UTF-8''${encodedName}`,
    "cache-control": "private, no-store",
  });
  if (!published.ok) throw new Error("Storage write failed");
}
