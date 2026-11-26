import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { listApplications } from "@/data/applications";
import { NewDraft, DraftControls } from "@/components/workspace/dashboard-controls";
import { formatDate } from "@/components/workspace/editor-types";
import { STEP_LABELS } from "@/lib/workspace/model";

export const metadata = { title: "我的草稿" };

export default async function ApplicationsPage() {
  const { userId } = await auth.protect();
  const drafts = await listApplications(userId);
  return <div className="workspace-dashboard">
    <header className="workspace-heading">
      <h1>我的草稿</h1>
      <p>继续准备你的 Visitor visa (subclass 600)，也可以为新的行程建立一份草稿。</p>
    </header>
    <section className="workspace-panel">
      <h2>已保存的申请</h2>
      {drafts.length ? <ul className="draft-list">
        {drafts.map((draft) => <li key={draft.id}>
          <div>
            <h3>{formatDate(draft.createdAt)} 创建的草稿</h3>
            <p>上次停在「{STEP_LABELS[draft.lastStep]}」</p>
            <p className="workspace-meta">上次保存于 {formatDate(draft.updatedAt, true)}（北京时间） · 保留至 {formatDate(draft.expiresAt)}</p>
          </div>
          <DraftControls id={draft.id} step={draft.lastStep} />
        </li>)}
      </ul> : <p>这里还没有草稿。确认下方的适用范围后，就可以开始填写。</p>}
    </section>
    <section className="workspace-panel">
      <h2>新建草稿</h2>
      <p>本工作区适用于成年人从澳大利亚境外准备本人的 Tourist stream 旅游或探亲访友申请。你可以先阅读<Link href="/guide">适用范围和准备指南</Link>。</p>
      <NewDraft />
    </section>
  </div>;
}
