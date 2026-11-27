"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { OFFICIAL } from "@/lib/workspace/model";

const questions = [
  { id: "age", title: "你是否已年满 18 岁？", choices: [["adult", "已满 18 岁"], ["minor", "未满 18 岁"]] },
  { id: "location", title: "你目前在哪里？", choices: [["offshore", "澳大利亚境外"], ["onshore", "澳大利亚境内"]] },
  { id: "purpose", title: "本次赴澳的主要目的是什么？", choices: [["holiday", "旅游度假"], ["visit", "探亲访友"], ["other", "其他目的"]] },
] as const;
type Selection = Partial<Record<typeof questions[number]["id"], string>>;

export function ScopeCheck() {
  const [selection, setSelection] = useState<Selection>({});
  const complete = questions.every(({id}) => Boolean(selection[id]));
  const inScope = complete && selection.age === "adult" && selection.location === "offshore" && selection.purpose !== "other";
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
      {inScope && <><p>你可以使用 VBER 准备自己的申请。登录后即可保存进度。</p><Button asChild><Link href="/applications" prefetch={false}>进入我的草稿</Link></Button></>}
      {complete && !inScope && <><p>你选择的情况超出本工作区的适用范围。可根据情况查阅官方指南。</p><ul className="grid gap-2">
        {selection.age === "minor" && <li><a className="text-link" href={OFFICIAL.stream}>查看未成年申请人的材料说明 ↗</a></li>}
        {selection.location === "onshore" && <li><a className="text-link" href={OFFICIAL.onshore}>查看澳大利亚境内申请指南 ↗</a></li>}
        {selection.purpose === "other" && <li><a className="text-link" href={OFFICIAL.finder}>使用 Visa Finder 查询适用类别 ↗</a></li>}
      </ul></>}
    </div>
  </section>;
}
