import "server-only";
import { reviewedPassages, searchPassages } from "../workspace/assistant-library";
import { STEPS, type Step } from "../workspace/model";
import { isDocumentId } from "../workspace/storage-policy";
import { redactAssistantQuestion, selectReviewedPassage } from "./provider";

export interface PilotQuestion {
  draftId: string;
  step: Step;
  question: string;
  previousPassageId?: string;
  consent: boolean;
}
export interface PilotReply {
  kind: "answered" | "library" | "unavailable" | "quota" | "invalid";
  passageIds: string[];
}

export async function answerPilotQuestion(input: PilotQuestion, allowed: boolean,
  authorize: (needsProvider: boolean) => Promise<"allowed" | "unavailable" | "quota">,
  send: typeof fetch = fetch): Promise<PilotReply> {
  if (!input || !isDocumentId(input.draftId) || !STEPS.includes(input.step)
      || typeof input.question !== "string" || !input.question.trim() || input.question.length > 500
      || typeof input.consent !== "boolean" || (input.previousPassageId !== undefined
        && (typeof input.previousPassageId !== "string" || input.previousPassageId.length > 100))) {
    return { kind: "invalid", passageIds: [] };
  }

  const matches = searchPassages(input.question, input.step);
  const previous = reviewedPassages.find(p => p.id === input.previousPassageId);
  const candidates = matches.slice(0, 3);
  if (previous && !candidates.some(p => p.id === previous.id)) candidates.push(previous);
  const suggestions = candidates.length ? candidates : searchPassages("", input.step).slice(0, 3);
  const fallback: PilotReply = { kind: "library", passageIds: suggestions.map(p => p.id) };
  if (!allowed || !input.consent) return fallback;
  const direct = matches[0] && matches[0].kind !== "guide" ? matches[0] : undefined;
  const question = redactAssistantQuestion(input.question);
  const needsProvider = !direct && candidates.length > 0 && Boolean(question);
  const started = Date.now();
  let called = false;
  let outcome: PilotReply["kind"] = "library";
  let usage: Awaited<ReturnType<typeof selectReviewedPassage>>["usage"] = null;
  try {
    const access = await authorize(needsProvider);
    if (access !== "allowed") {
      outcome = access;
      return { kind: outcome, passageIds: fallback.passageIds };
    }
    if (direct) {
      outcome = "answered";
      return { kind: outcome, passageIds: [direct.id] };
    }
    if (!needsProvider) return fallback;
    called = true;
    const result = await selectReviewedPassage(input.step, question, previous?.id, candidates, send);
    usage = result.usage;
    if (!result.passageId) return fallback;
    outcome = "answered";
    return { kind: outcome, passageIds: [result.passageId] };
  } catch {
    return fallback;
  } finally {
    console.info("assistant_pilot_request", { outcome, providerCalls: Number(called),
      answered: Number(outcome === "answered"), latencyMs: Date.now() - started,
      estimatedCostUsd: called ? usage?.estimatedCostUsd ?? null : 0,
      inputTokens: usage?.inputTokens, outputTokens: usage?.outputTokens });
  }
}
