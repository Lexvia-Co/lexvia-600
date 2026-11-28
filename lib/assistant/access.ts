import "server-only";
import { headers } from "next/headers";

export function pilotAccessAllowed(userId: string, requestHeaders: Pick<Headers, "get">,
  env: Readonly<Record<string, string | undefined>>) {
  if (!userId || !env.OPENAI_API_KEY?.trim() || env.VERCEL !== "1"
      || (env.VERCEL_ENV !== "production" && env.VERCEL_ENV !== "preview")) return false;
  // Custom domains can put a reverse proxy in front of Vercel, making its IP appear to be the user's.
  const host = requestHeaders.get("host");
  if (!host?.endsWith(".vercel.app") || ![env.VERCEL_URL, env.VERCEL_PROJECT_PRODUCTION_URL].includes(host)) return false;
  return requestHeaders.get("x-vercel-ip-country") === "AU"
    && Boolean(env.VBER_ASSISTANT_PILOT_USER_IDS?.split(",").some(id => id.trim() === userId));
}

// Vercel supplies the IP country at its edge. Self-hosted and local origins have no trusted signal.
export async function canUseAssistantPilot(userId: string) {
  return pilotAccessAllowed(userId, await headers(), process.env);
}
