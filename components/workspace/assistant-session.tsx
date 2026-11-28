"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { askPreparationAssistant } from "@/app/applications/[id]/assistant/actions";

type Exchange = {
  question: string;
  result: Awaited<ReturnType<typeof askPreparationAssistant>>;
};

const Session = createContext<{
  exchanges: Exchange[];
  setExchanges: Dispatch<SetStateAction<Exchange[]>>;
} | null>(null);

export function AssistantSession({ children }: { children: ReactNode }) {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  return <Session.Provider value={{ exchanges, setExchanges }}>{children}</Session.Provider>;
}

export function useAssistantSession() {
  const session = useContext(Session);
  if (!session) throw new Error("PreparationAssistant needs a draft session");
  return session;
}
