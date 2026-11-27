import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ANSWER_LABELS, STEP_FIELDS, type Answers, type AnswerKey, type Step } from "@/lib/workspace/model";
import type { AnswerErrors } from "./editor-types";

const choices: Partial<Record<AnswerKey, Record<string, string>>> = {
  purpose: { holiday: "旅游度假", visit: "探亲访友" },
  payer: { self: "我自己", host: "邀请我去澳大利亚的人", other: "其他人", shared: "几个人一起付" },
};
const multiLine: AnswerKey[] = ["destinations", "accommodation", "travelHistory", "hostAddress", "fundingDetails", "returnTies"];
const dateFields: AnswerKey[] = ["birthDate", "passportExpiry", "arrivalDate", "departureDate"];
const autoComplete: Partial<Record<AnswerKey, string>> = {
  givenNames: "given-name", familyName: "family-name", birthDate: "bday", email: "email",
};
const hints: Partial<Record<AnswerKey, string>> = {
  familyName: "姓和名都按护照个人资料页上的拼写填写。如果护照只列了姓或名，填对应的一栏就可以。",
  travelHistory: "写下你去过的国家或地区、大概什么时候去的、每次待了多久。没有出境记录就填“无”。",
  fundingDetails: "大概会花多少钱？钱从哪里来？可以写下你手头有哪些材料能说明这笔钱的来源。",
  occupation: "可以写你做什么工作、在哪里上学，或说明已退休等情况。",
  returnTies: "比如什么时候回去上班、开学，或回国后需要照顾哪位家人。",
};

export function visibleFields(step: Step, answers: Answers) {
  return STEP_FIELDS[step].filter((key) => !key.startsWith("host") || answers.purpose === "visit");
}

export function answerDisplay(key: AnswerKey, value: string) {
  return choices[key]?.[value] ?? value;
}

export function AnswerFields({ step, answers, errors, onChange }: {
  step: Step; answers: Answers; errors: AnswerErrors;
  onChange: (key: AnswerKey, value: string) => void;
}) {
  return <FieldGroup>{visibleFields(step, answers).map((key) => {
    const error = errors[key];
    const hint = hints[key];
    const descriptionId = [hint && `${key}-hint`, error && `${key}-error`].filter(Boolean).join(" ") || undefined;
    const options = choices[key];
    if (options) return <FieldSet key={key} data-invalid={!!error} aria-describedby={descriptionId}>
      <FieldLegend variant="label">{ANSWER_LABELS[key]}</FieldLegend>
      <div className="workspace-choices">{Object.entries(options).map(([value, label], index) => <label className="workspace-choice" key={value}>
        <input type="radio" name={key} id={index === 0 ? key : `${key}-${value}`} value={value} checked={answers[key] === value}
          aria-describedby={descriptionId} onChange={() => onChange(key, value)} /> {label}
      </label>)}</div>
      {error && <FieldError id={`${key}-error`}>{error}</FieldError>}
    </FieldSet>;
    const props = { id: key, name: key, value: answers[key], maxLength: 4000, autoComplete: autoComplete[key],
      "aria-invalid": !!error, "aria-describedby": descriptionId,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(key, event.target.value) };
    return <Field key={key} data-invalid={!!error}>
      <FieldLabel htmlFor={key}>{ANSWER_LABELS[key]}</FieldLabel>
      {hint && <FieldDescription id={`${key}-hint`}>{hint}</FieldDescription>}
      {multiLine.includes(key) ? <Textarea rows={3} {...props} /> :
        <Input type={dateFields.includes(key) ? "date" : key === "email" ? "email" : "text"} {...props} />}
      {error && <FieldError id={`${key}-error`}>{error}</FieldError>}
    </Field>;
  })}</FieldGroup>;
}
