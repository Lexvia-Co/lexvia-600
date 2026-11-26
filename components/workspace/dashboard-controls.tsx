"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createDraft, removeDraft, resumeDraft } from "@/app/applications/actions";
import type { Step } from "@/lib/workspace/model";

export function NewDraft() {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return <form method="post" className="workspace-stack" onSubmit={(event) => {
    event.preventDefault();
    const checkbox = event.currentTarget.elements.namedItem("scope");
    const scope = checkbox instanceof HTMLInputElement && checkbox.checked;
    if (!scope) {
      setMessage("请先确认这份草稿适合你的申请。");
      return;
    }
    start(async () => {
      try {
        const result = await createDraft(scope);
        if (result.ok) router.push(`/applications/${result.id}/identity`);
        else setMessage(result.message);
      } catch { setMessage("未能创建草稿，请重试。"); }
    });
  }}>
    <label className="workspace-choice"><input type="checkbox" name="scope" onChange={() => setMessage("")} />
      我已年满 18 岁，目前在澳大利亚境外，准备为自己申请赴澳旅游或探亲访友。</label>
    <p className="workspace-meta">草稿和上传的文件从上次主动继续或成功修改起保留 90 天。你也可以提前删除。</p>
    <div><Button type="submit" disabled={pending}>{pending ? "正在创建…" : "创建私人草稿"}</Button></div>
    {message && <p role="alert">{message}</p>}
  </form>;
}

export function DraftControls({ id, step }: { id: string; step: Step }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  function run(deleting: boolean) {
    start(async () => {
      try {
        const result = deleting ? await removeDraft(id) : await resumeDraft(id);
        if (!result.ok) return setMessage(result.message);
        if (deleting) router.refresh();
        else router.push(`/applications/${id}/${step}`);
      } catch { setMessage("操作未能完成，请重试。"); }
    });
  }
  return <div className="workspace-stack">
    {confirm && <p>删除后，草稿及其文件将无法找回。</p>}
    <div className="workspace-actions">
      {confirm ? <>
        <Button type="button" variant="destructive" disabled={pending} onClick={() => run(true)}>确认删除草稿和文件</Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirm(false)}>取消</Button>
      </> : <>
        <Button type="button" disabled={pending} onClick={() => run(false)}>继续准备</Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirm(true)}>删除</Button>
      </>}
    </div>
    {message && <p role="alert">{message}</p>}
  </div>;
}
