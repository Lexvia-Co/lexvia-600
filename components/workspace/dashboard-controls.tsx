"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { createDraft, removeDraft, resumeDraft } from "@/app/applications/actions";
import { TRIP_PURPOSES, type TripPurpose } from "@/lib/workspace/draft-start";

export function NewDraft({ initialPurpose }: { initialPurpose?: TripPurpose }) {
  const [purpose, setPurpose] = useState(initialPurpose);
  const [confirmed, setConfirmed] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return <form method="post" noValidate className="workspace-panel" onSubmit={(event) => {
    event.preventDefault();
    setAttempted(true);
    setMessage("");
    if (!confirmed) {
      event.currentTarget.querySelector<HTMLInputElement>("#confirm-applicant")?.focus();
      return;
    }
    start(async () => {
      try {
        const result = await createDraft(confirmed, purpose);
        if (result.ok) router.replace(`/applications/${result.id}/identity`);
        else setMessage(result.message);
      } catch { setMessage("未能创建草稿，请重试。"); }
    });
  }}>
    <FieldGroup>
      <FieldSet>
        <FieldLegend variant="label">这次去澳大利亚主要是为了什么？（选填）</FieldLegend>
        <div className="workspace-choices">
          {(["holiday", "visit"] as const).map((value) => <label className="workspace-choice" key={value}>
            <input type="radio" id={`purpose-${value}`} name="purpose" value={value}
              checked={purpose === value} onChange={() => setPurpose(value)} />
            {TRIP_PURPOSES[value]}
          </label>)}
        </div>
      </FieldSet>
      <Field data-invalid={attempted && !confirmed}>
        <FieldLabel htmlFor="confirm-applicant" className="workspace-choice">
          <input type="checkbox" id="confirm-applicant" name="scope" required checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)} aria-invalid={attempted && !confirmed}
            aria-describedby={attempted && !confirmed ? "confirmation-error" : undefined} />
          我已年满 18 岁，目前在澳大利亚境外，正在为自己准备赴澳旅游或探亲访友的申请。
        </FieldLabel>
        {attempted && !confirmed && <FieldError id="confirmation-error">请先确认你在为自己准备申请，并且符合上述条件。</FieldError>}
      </Field>
      <FieldDescription>每次继续填写或保存修改，草稿和文件都会再保留 90 天。你也可以随时删除。</FieldDescription>
    </FieldGroup>
    <div><Button type="submit" disabled={pending}>{pending ? "正在创建…" : "创建草稿"}</Button></div>
    {message && <p role="alert">{message}</p>}
  </form>;
}

export function DraftControls({ id }: { id: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  function run(deleting: boolean) {
    start(async () => {
      try {
        const result = deleting ? await removeDraft(id) : await resumeDraft(id);
        if (!result.ok) return setMessage(result.message);
        if ("lastStep" in result) router.push(`/applications/${id}/${result.lastStep}`);
        else router.refresh();
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
