import { OFFICIAL } from "./model";
import { documentMedia, type EvidenceFile } from "./storage-policy";

export type DocumentLanguage = "english" | "nonEnglish" | "unknown";
export type DocumentUse = "document" | "portrait" | "unknown";
export type FileInspection = "clear" | "secured" | "unreadable" | "unknown";

export const DOCUMENT_CHECK_GUIDANCE = {
  reviewed: "2026-11-28",
  attachments: OFFICIAL.attachments,
  translations: OFFICIAL.visitor,
} as const;

const findings = {
  documentSize: { message: "这份文件超过 ImmiAccount 的 5 MB 上限。", action: "选择较小的副本" },
  portraitSize: { message: "个人证件照的文件大小应在 70 KB 至 3.5 MB 之间。", action: "选择合适大小的照片" },
  portraitFormat: { message: "ImmiAccount 的个人证件照需要使用 JPG 格式。", action: "选择 JPG 副本" },
  useUnknown: { message: "请确认图片用途，以便按对应的大小要求检查。", action: "选择图片用途" },
  languageUnknown: { message: "这份原件的语言尚未确认。", action: "选择原件语言" },
  translationMissing: { message: "这份非英文原件还没有对应的英文译本。", action: "添加英文译本" },
  pdfUnknown: { message: "这份 PDF 尚未检查能否读取或是否受保护。", action: "检查 PDF" },
  pdfSecured: { message: "这份 PDF 受保护，ImmiAccount 无法接收。", action: "选择未加密的副本" },
  pdfUnreadable: { message: "无法读取这份 PDF 的文档结构。", action: "选择可打开的副本" },
  imageUnknown: { message: "这张图片尚未检查能否读取。", action: "检查图片" },
  imageUnreadable: { message: "无法确认这张图片能否完整读取。", action: "选择可打开的图片" },
} as const;

export type DocumentIssue = { code: keyof typeof findings; message: string; action: string };

export function isReferenceFile(file: EvidenceFile, groupFiles: readonly EvidenceFile[]): boolean {
  return file.referenceOnly || (file.role === "translation" && groupFiles.some(original =>
    original.id === file.originalId && original.referenceOnly));
}

export function documentIssues(file: EvidenceFile, groupFiles: readonly EvidenceFile[]): DocumentIssue[] {
  if (isReferenceFile(file, groupFiles)) return [];
  const media = documentMedia(file.name);
  const use = media === "application/pdf" || file.role === "translation" ? "document" : file.intendedUse;
  const codes: DocumentIssue["code"][] = [];

  if (use === "unknown") {
    codes.push("useUnknown");
  } else if (use === "portrait") {
    if (file.size < 70_000 || file.size > 3_500_000) codes.push("portraitSize");
    if (media !== "image/jpeg") codes.push("portraitFormat");
  } else {
    if (file.size > 5_000_000) codes.push("documentSize");
    if (file.role === "original") {
      if (file.language === "unknown") codes.push("languageUnknown");
      if (file.language === "nonEnglish" && !groupFiles.some(translation =>
        translation.role === "translation" && translation.originalId === file.id && !translation.referenceOnly)) {
        codes.push("translationMissing");
      }
    }
  }

  if (media === "application/pdf") {
    if (file.fileInspection === "secured") codes.push("pdfSecured");
    if (file.fileInspection === "unreadable") codes.push("pdfUnreadable");
    if (file.fileInspection === "unknown") codes.push("pdfUnknown");
  } else {
    if (file.fileInspection === "unreadable") codes.push("imageUnreadable");
    if (file.fileInspection === "unknown") codes.push("imageUnknown");
  }
  return codes.map(code => ({ code, ...findings[code] }));
}
