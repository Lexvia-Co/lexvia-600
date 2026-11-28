import type { Answers, Step, TemplateKind } from "@/lib/workspace/model";
import type { EnglishWording } from "@/lib/workspace/handoff";

export type SavedTemplates = Partial<Record<TemplateKind, { body: string; fingerprint: string }>>;
export type AnswerErrors = Partial<Record<keyof Answers, string>>;
export type SaveInput = {
  id: string;
  revision: number;
  step: Step;
  destination: Step;
  continue: boolean;
  answers?: Partial<Answers>;
  notes?: Record<string, string>;
  templates?: SavedTemplates;
  englishWording?: EnglishWording;
};
export type SaveResult =
  | { ok: true; revision: number; updatedAt: string; expiresAt: string }
  | { ok: false; message: string; errors?: AnswerErrors; conflict?: boolean };

export function formatDate(value: string | Date, withTime = false) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value));
}
