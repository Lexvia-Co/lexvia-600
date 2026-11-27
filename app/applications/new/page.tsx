import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { connection } from "next/server";
import { NewDraft } from "@/components/workspace/dashboard-controls";
import { isTripPurpose } from "@/lib/workspace/draft-start";

export const metadata = { title: "新建草稿" };

export default async function NewApplicationPage({ searchParams }: {
  searchParams: Promise<{ purpose?: string | string[] }>;
}) {
  await connection();
  await auth.protect();
  const { purpose } = await searchParams;

  return <div className="workspace-dashboard">
    <div><Link href="/applications" prefetch={false}>返回我的草稿</Link></div>
    <header className="workspace-heading">
      <h1>新建草稿</h1>
    </header>
    <NewDraft initialPurpose={isTripPurpose(purpose) ? purpose : undefined} />
  </div>;
}
