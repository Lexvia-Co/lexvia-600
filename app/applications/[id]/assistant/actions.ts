"use server";

import { auth } from "@clerk/nextjs/server";
import { authorizeAssistantQuestion } from "@/data/assistant-usage";
import { canUseAssistantPilot } from "@/lib/assistant/access";
import { answerPilotQuestion, type PilotQuestion, type PilotReply } from "@/lib/assistant/pilot";

export async function askPreparationAssistant(input: PilotQuestion): Promise<PilotReply> {
  const { userId } = await auth.protect();
  const allowed = await canUseAssistantPilot(userId);
  return answerPilotQuestion(input, allowed, needsProvider => authorizeAssistantQuestion(userId, input.draftId, needsProvider));
}
