export type DocumentRole = "original" | "translation";
export type DocumentMedia = "application/pdf" | "image/jpeg" | "image/png";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const UPLOAD_URL_SECONDS = 300;
export const DOWNLOAD_URL_SECONDS = 60;
export const ACCEPT_DOCUMENTS = ".pdf,.jpg,.jpeg,.png";

export interface EvidenceFile {
  id: string;
  name: string;
  size: number;
  role: DocumentRole;
  originalId: string | null;
  downloadUrl: string;
}

export interface UploadInput {
  requestId: string;
  evidenceKey: string;
  role: DocumentRole;
  originalId: string | null;
  fileName: string;
  size: number;
}

export function documentMedia(name: string): DocumentMedia | undefined {
  if (/\.pdf$/i.test(name)) return "application/pdf";
  if (/\.jpe?g$/i.test(name)) return "image/jpeg";
  if (/\.png$/i.test(name)) return "image/png";
}

export function validFileName(name: unknown): name is string {
  if (typeof name !== "string" || !name.trim() || name.startsWith(".") || name.length > 180) return false;
  // Keep names safe in downloads and avoid misleading right-to-left extensions.
  return !/[\\/\u202a-\u202e\u2066-\u2069]/u.test(name)
    && [...name].every(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127)
    && name.isWellFormed() && !!documentMedia(name);
}

export function validFileSize(size: unknown): size is number {
  return typeof size === "number" && Number.isSafeInteger(size) && size > 0 && size <= MAX_FILE_BYTES;
}

export function isDocumentId(id: unknown): id is string {
  return typeof id === "string" && /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id);
}
