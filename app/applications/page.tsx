import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { connection } from "next/server";
import { listApplications } from "@/data/applications";
import { DraftControls } from "@/components/workspace/dashboard-controls";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/components/workspace/editor-types";
import { draftTitles } from "@/components/workspace/draft-titles";
import { STEP_LABELS } from "@/lib/workspace/model";

export const metadata = { title: "我的草稿" };

export default async function ApplicationsPage() {
  await connection();
  const { userId } = await auth.protect();
  const drafts = await listApplications(userId);
  const titles = draftTitles(drafts);
  return <div className="workspace-dashboard">
    <header className="workspace-heading">
      <h1>我的草稿</h1>
      <div><Button asChild><Link href="/applications/new" prefetch={false}>新建草稿</Link></Button></div>
    </header>
    <section className="workspace-panel">
      <h2>已保存的草稿</h2>
      {drafts.length ? <ul className="draft-list">
        {drafts.map((draft) => <li key={draft.id}>
          <div>
            <h3>{titles.get(draft.id)}</h3>
            <p>上次停在「{STEP_LABELS[draft.lastStep]}」</p>
            <p className="workspace-meta">上次保存于 {formatDate(draft.updatedAt, true)}（北京时间） · 保留至 {formatDate(draft.expiresAt)}</p>
          </div>
          <DraftControls id={draft.id} />
        </li>)}
      </ul> : <p>你还没有草稿。可以先看看<Link href="/guide">申请指南</Link>，也可以直接新建一份。</p>}
    </section>
  </div>;
}
