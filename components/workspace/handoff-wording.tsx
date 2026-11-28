import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { canConfirmEnglish, type EnglishEntry, type WordingKey } from "@/lib/workspace/handoff";
import { ANSWER_LABELS } from "@/lib/workspace/model";
import { CopyButton } from "./copy-button";

export function HandoffWording({ field, source, entry, onChange, onConfirm }: {
  field: WordingKey; source: string; entry?: EnglishEntry;
  onChange: (key: WordingKey, text: string) => void;
  onConfirm: (key: WordingKey, text: string) => void;
}) {
  const text = entry?.text ?? (canConfirmEnglish(source) ? source : "");
  const id = "english-" + field;
  return <div className="handoff-wording">
    <Field className="no-print">
      <FieldLabel htmlFor={id}>{ANSWER_LABELS[field]} · 英文表述</FieldLabel>
      <Textarea id={id} value={text} maxLength={4000} lang="en" rows={2}
        onChange={event => onChange(field, event.target.value)} />
    </Field>
    {entry?.confirmed ? <>
      <p className="print-wording" lang="en">{text}</p>
      <CopyButton text={text} targetId={id} label={ANSWER_LABELS[field] + "的英文表述"}>复制英文</CopyButton>
    </> : <>
      <span className="workspace-meta">英文待核对</span>
      <Button type="button" variant="outline" size="sm" className="no-print"
        disabled={!canConfirmEnglish(text)} onClick={() => onConfirm(field, text)}>确认并保存英文</Button>
    </>}
  </div>;
}
