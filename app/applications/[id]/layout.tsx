import { auth } from "@clerk/nextjs/server";
import { AssistantSession } from "@/components/workspace/assistant-session";

export default async function DraftLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { sessionId } = await auth.protect();
  const { id } = await params;
  return <AssistantSession key={sessionId + id}>{children}</AssistantSession>;
}
