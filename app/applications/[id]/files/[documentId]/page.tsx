import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { readUpload } from "@/data/documents";
import { signDownload } from "@/lib/workspace/storage";
import { DOWNLOAD_URL_SECONDS } from "@/lib/workspace/storage-policy";

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ id: string; documentId: string }>;
}) {
  const { userId } = await auth.protect();
  const { id, documentId } = await params;
  const doc = await readUpload(userId, id, documentId);
  if (!doc || doc.state !== "ready") notFound();
  const seconds = Math.min(DOWNLOAD_URL_SECONDS, Math.floor((doc.expiresAt.getTime() - Date.now()) / 1000));
  if (seconds < 1) notFound();
  redirect(await signDownload(doc.id, seconds));
}
