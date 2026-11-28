"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { askPreparationAssistant } from "@/app/applications/[id]/assistant/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { reviewedPassages, searchPassages, type ReviewedPassage } from "@/lib/workspace/assistant-library";
import { OFFICIAL, STEP_LABELS, type Step } from "@/lib/workspace/model";
import { useAssistantSession } from "./assistant-session";

type Props = { draftId: string; step: Step; pilotAvailable: boolean };
type Result = Awaited<ReturnType<typeof askPreparationAssistant>>;

function PassageAnswer({ passage, draftId, step }: {
  passage: ReviewedPassage; draftId: string; step: Step;
}) {
  const href = (step === passage.step ? "" : `/applications/${draftId}/${passage.step}`) + "#" + passage.anchor;
  return <div data-passage-id={passage.id} className="grid min-w-0 gap-2 pb-2 pt-1">
    <p>{passage.answer}</p>
    <p className="workspace-meta">
      <a href={passage.source} target="_blank" rel="noreferrer">Home Affairs · {passage.sourceSection}</a>
      {" · 核对日期 "}<time dateTime={passage.reviewed}>{passage.reviewed}</time>
    </p>
    {passage.kind !== "referral" && <p><Link href={href} prefetch={false} onClick={() => {
      if (step !== passage.step) return;
      const target = document.getElementById(passage.anchor);
      const details = target?.closest("details");
      if (details) details.open = true;
      target?.focus();
    }}>{passage.action}</Link></p>}
  </div>;
}

function Topics({ passages, draftId, step, onFollowUp }: {
  passages: readonly ReviewedPassage[]; draftId: string; step: Step;
  onFollowUp?: (passage: ReviewedPassage) => void;
}) {
  return <div className="grid gap-1">
    {passages.map(passage => <details key={passage.id} className="workspace-item">
      <summary>{passage.question}</summary>
      <PassageAnswer passage={passage} draftId={draftId} step={step} />
      {onFollowUp && <Button type="button" size="sm" variant="outline"
        onClick={() => onFollowUp(passage)}>就这个问题追问</Button>}
    </details>)}
  </div>;
}

const replyLabels: Record<Result["kind"], string> = {
  answered: "相关解答",
  library: "可以参考这些已核对的问题",
  unavailable: "实时追问暂时不可用，你可以参考这些问题",
  quota: "已达到试用提问上限，你可以继续查阅这些问题",
  invalid: "请换一种问法，再试一次",
};

export function PreparationAssistant({ draftId, step, pilotAvailable }: Props) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [question, setQuestion] = useState("");
  const [topic, setTopic] = useState<ReviewedPassage | null>(null);
  const questionField = useRef<HTMLTextAreaElement>(null);
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const { exchanges, setExchanges } = useAssistantSession();
  const searching = !!query.trim();
  const topics = !searching && showAll ? reviewedPassages : searchPassages(query, step);

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (!pilotAvailable || !consent || !text || submitting.current) return;
    submitting.current = true;
    setPending(true);
    const previous = exchanges.at(-1)?.result;
    const previousPassageId = topic?.id ?? (previous?.kind === "answered" ? previous.passageIds[0] : undefined);
    let result: Result;
    try {
      result = await askPreparationAssistant({ draftId, step, question: text, consent, previousPassageId });
    } catch {
      const matches = searchPassages(text, step);
      result = {
        kind: "unavailable",
        passageIds: (matches.length ? matches : searchPassages("", step)).slice(0, 3).map(passage => passage.id),
      };
    } finally {
      submitting.current = false;
      setPending(false);
    }
    setExchanges(previous => [...previous, { question: text, result }]);
    setQuestion("");
    setTopic(null);
  }

  return <details className="workspace-item no-print">
    <summary>申请准备助手</summary>
    <div className="workspace-stack">
      <Field>
        <FieldLabel htmlFor={id + "-search"}>搜索常见问题</FieldLabel>
        <Input id={id + "-search"} type="search" value={query} maxLength={400}
          placeholder="例如：银行流水的英文译本放在哪里？" onChange={event => setQuery(event.target.value)} />
        <FieldDescription>输入材料名称或准备步骤即可搜索。搜索在本页完成。</FieldDescription>
      </Field>
      <section className="grid gap-2" aria-labelledby={id + "-topics"}>
        <h3 id={id + "-topics"}>{searching ? "搜索结果" : showAll ? "全部常见问题" : STEP_LABELS[step] + "常见问题"}</h3>
        {searching && <p className="workspace-meta" role="status">{topics.length ? `找到 ${topics.length} 个相关问题` : "没有找到匹配的问题。可以换个关键词，或查看官方访客签证指引。"}</p>}
        {!topics.length && <a href={OFFICIAL.visitor} target="_blank" rel="noreferrer">查看 Home Affairs 访客签证指引</a>}
        <Topics passages={topics} draftId={draftId} step={step} onFollowUp={pilotAvailable ? passage => {
          setTopic(passage);
          questionField.current?.focus();
        } : undefined} />
        {!searching && <div><Button type="button" variant="link" size="sm" onClick={() => setShowAll(!showAll)}>
          {showAll ? "只看本步骤" : "查看全部常见问题"}
        </Button></div>}
      </section>
      {pilotAvailable && <section className="grid gap-3" aria-labelledby={id + "-pilot"}>
        <h3 id={id + "-pilot"}>试用实时追问</h3>
        <p className="workspace-meta">澳大利亚内部试用仅用于模拟草稿。请勿输入真实姓名、护照号、联系方式或申请编号。对话只保留在当前草稿会话中。</p>
        {exchanges.length > 0 && <div className="grid gap-3">
          <ol aria-label="本次会话的问答" className="grid gap-3">
            {exchanges.map(({ question: asked, result }, index) => {
              const passages = result.passageIds.flatMap(passageId =>
                reviewedPassages.filter(passage => passage.id === passageId));
              return <li key={index} data-result-kind={result.kind} className="workspace-review-section">
                <p><strong>你的问题</strong> · {asked}</p>
                <p>{replyLabels[result.kind]}</p>
                {result.kind === "answered" ? passages.map(passage =>
                  <PassageAnswer key={passage.id} passage={passage} draftId={draftId} step={step} />) :
                  <Topics passages={passages} draftId={draftId} step={step} />}
                {result.kind !== "answered" && <p className="workspace-meta"><a
                  href={passages[0]?.source ?? OFFICIAL.visitor} target="_blank" rel="noreferrer">查看相关 Home Affairs 指引</a></p>}
              </li>;
            })}
          </ol>
          <div><Button size="sm" variant="outline" type="button" disabled={pending}
            onClick={() => setExchanges([])}>清除本次问答</Button></div>
        </div>}
        <form onSubmit={ask}>
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor={id + "-question"}>你的追问</FieldLabel>
              {topic && <FieldDescription>正在追问「{topic.question}」</FieldDescription>}
              <Textarea ref={questionField} id={id + "-question"} rows={2} maxLength={500} value={question} disabled={pending}
                onChange={event => setQuestion(event.target.value)} />
            </Field>
            <p id={id + "-privacy"} className="workspace-meta">发送后，OpenAI 可能收到去除可识别信息的提问、当前步骤和相关指引。OpenAI 的滥用监测日志默认最多保留内容 30 天，法律要求或保护服务及他人安全时可能延长。
              {" "}<a href="https://developers.openai.com/api/docs/guides/your-data" target="_blank" rel="noreferrer">了解数据保留方式</a>
            </p>
            <label className="workspace-choice">
              <input type="checkbox" checked={consent} disabled={pending} aria-describedby={id + "-privacy"}
                onChange={event => setConsent(event.target.checked)} />我同意使用 OpenAI 处理我在本页发送的追问
            </label>
            <div><Button type="submit" disabled={!consent || !question.trim() || pending}>发送追问</Button></div>
          </FieldGroup>
        </form>
        <p role="status" className="workspace-meta">{pending ? "正在查找相关解答…" :
          exchanges.length ? "已收到回复，请查看本次会话的问答。" : ""}</p>
      </section>}
    </div>
  </details>;
}
