import { STEP_FIELDS, validateStep, type Answers } from "./model";

export const ANSWER_STEPS = ["identity", "visit", "funding"] as const;
export type AnswerStep = (typeof ANSWER_STEPS)[number];

export function answerProgress(step: AnswerStep, answers: Answers) {
  const started = STEP_FIELDS[step].some(key =>
    (!key.startsWith("host") || answers.purpose === "visit") && answers[key].trim(),
  );
  if (!started) return "未填写";
  return Object.keys(validateStep(step, answers)).length ? "填写中" : "已填好";
}

export type StepProgress = Record<AnswerStep, ReturnType<typeof answerProgress>>;
