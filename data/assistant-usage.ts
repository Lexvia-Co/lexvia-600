import "server-only";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "../lib/neon/database";
import { applications, assistantUsage } from "../src/db/schema";
import { ownedDraft, validId } from "./workspace-state";

export const DAILY_ASSISTANT_LIMIT = 10;

export function assistantQuotaKey(ownerId: string) {
  return createHash("sha256").update("vber-assistant-quota:" + ownerId).digest("hex");
}

export async function authorizeAssistantQuestion(ownerId: string, draftId: string, needsProvider: boolean) {
  if (!validId(draftId)) return "unavailable";
  return getDatabase().transaction(async tx => {
    const [draft] = await tx.select({ expiresAt: applications.expiresAt }).from(applications)
      .where(ownedDraft(ownerId, draftId)).for("share");
    if (!draft || draft.expiresAt.getTime() <= Date.now()) return "unavailable" as const;
    if (!needsProvider) return "allowed" as const;

    const quotaKey = assistantQuotaKey(ownerId);
    await tx.insert(assistantUsage).values({ ownerId: quotaKey, day: new Date().toISOString().slice(0, 10), attempts: 0 })
      .onConflictDoNothing();
    const ownCounter = eq(assistantUsage.ownerId, quotaKey);
    const [counter] = await tx.select().from(assistantUsage).where(ownCounter).for("update");
    const day = new Date().toISOString().slice(0, 10);
    const attempts = counter.day === day ? counter.attempts : 0;
    if (attempts >= DAILY_ASSISTANT_LIMIT) return "quota" as const;
    await tx.update(assistantUsage).set({ day, attempts: attempts + 1 }).where(ownCounter);
    return "allowed" as const;
  });
}
