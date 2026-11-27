"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { OFFICIAL } from "@/lib/workspace/model";
import { isTripPurpose, TRIP_PURPOSES } from "@/lib/workspace/draft-start";

const questions = [
  { id: "age", title: "你是否已年满 18 岁？", choices: [["adult", "已满 18 岁"], ["minor", "未满 18 岁"]] },
  { id: "location", title: "你目前在哪里？", choices: [["offshore", "澳大利亚境外"], ["onshore", "澳大利亚境内"]] },
  { id: "purpose", title: "这次去澳大利亚主要是为了什么？", choices: [["holiday", TRIP_PURPOSES.holiday], ["visit", TRIP_PURPOSES.visit], ["other", "其他目的"]] },
] as const;
type Selection = Partial<Record<typeof questions[number]["id"], string>>;

export function ScopeCheck() {
  const { isSignedIn } = useAuth();
  const [selection, setSelection] = useState<Selection>({});
  const complete = questions.every(({id}) => Boolean(selection[id]));
  const inScope = selection.age === "adult" && selection.location === "offshore" && isTripPurpose(selection.purpose);
  return <section className="scope-card" aria-labelledby="scope-heading">
    <h2 id="scope-heading">这份指南适合你吗？</h2>
    <p className="muted mt-2 mb-7">先回答三个问题，无需填写姓名或联系方式。</p>
    <FieldGroup>
      {questions.map(question => <FieldSet key={question.id} className="gap-3">
        <FieldLegend variant="label">{question.title}</FieldLegend>
        <div className="scope-choices">{question.choices.map(([value, label]) =>
          <label className="scope-choice" key={value}><input type="radio" name={question.id} value={value}
            checked={selection[question.id] === value} onChange={() => setSelection(previous => ({...previous, [question.id]: value}))} />{label}</label>)}</div>
      </FieldSet>)}
    </FieldGroup>
    <div aria-live="polite" className="scope-result">
      {inScope && <><p>你可以在 VBER 准备这次行程的申请材料。</p><Button asChild>
        <Link href={`/applications/new?purpose=${selection.purpose}`} prefetch={false}>{isSignedIn ? "开始准备" : "登录后开始准备"}</Link>
      </Button></>}
      {complete && !inScope && <><p>这份指南不适合你这次申请。可以从下面的官方说明开始。</p><ul className="grid gap-2">
        {selection.age === "minor" && <li><a className="text-link" href={OFFICIAL.stream}>查看未成年申请人的材料说明 ↗</a></li>}
        {selection.location === "onshore" && <li><a className="text-link" href={OFFICIAL.onshore}>查看澳大利亚境内申请指南 ↗</a></li>}
        {selection.purpose === "other" && <li><a className="text-link" href={OFFICIAL.finder}>使用 Visa Finder 查询适用类别 ↗</a></li>}
      </ul></>}
    </div>
  </section>;
}
