import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ANSWER_LABELS, STEP_FIELDS, type Answers, type AnswerKey, type Step } from "@/lib/workspace/model";
import type { AnswerErrors } from "./editor-types";

const choices: Partial<Record<AnswerKey, Record<string, string>>> = {
  purpose: { holiday: "旅游度假", visit: "探亲访友" },
  payer: { self: "我自己", host: "在澳邀请人", other: "其他人", shared: "共同承担" },
};
const multiLine: AnswerKey[] = ["destinations", "accommodation", "travelHistory", "hostAddress", "fundingDetails", "returnTies"];
const dateFields: AnswerKey[] = ["birthDate", "passportExpiry", "arrivalDate", "departureDate"];
const autoComplete: Partial<Record<AnswerKey, string>> = {
  givenNames: "given-name", familyName: "family-name", birthDate: "bday", email: "email",
};
const hints: Partial<Record<AnswerKey, string>> = {
  familyName: "按护照个人资料页的拼写填写。护照上只有一个姓名时，可只填写对应的一栏。",
  travelHistory: "可填写以往去过的国家或地区和大致时间。如没有出境记录，请填写“无”。",
  fundingDetails: "说明预计开支、由谁支付，以及你打算用哪些材料说明资金来源。",
  occupation: "可填写工作、学习、退休或其他实际情况。",
  returnTies: "可填写返岗、开学、家庭照护等与你有关的安排。",
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
