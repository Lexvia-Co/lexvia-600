import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { documentIssues, isReferenceFile, type DocumentLanguage, type DocumentUse } from "@/lib/workspace/document-checks";
import { documentMedia, type EvidenceDetailsChange, type EvidenceFile } from "@/lib/workspace/storage-policy";

const languages: Record<DocumentLanguage, string> = { unknown: "待确认", english: "英文", nonEnglish: "非英文" };
const uses: Record<DocumentUse, string> = { unknown: "待确认", document: "材料扫描件或照片", portrait: "个人证件照" };

function FileChoice<Value extends string>({ label, file, name, options, value, onSelect }: {
  label: string; file: EvidenceFile; name: string; options: Record<Value, string>; value: Value;
  onSelect: (value: Value) => void;
}) {
  return <FieldSet className="gap-1">
    <FieldLegend variant="label" className="mb-1">{label}<span className="sr-only">（{file.name}）</span></FieldLegend>
    <div className="workspace-choices">{(Object.keys(options) as Value[]).map(option =>
      <label className="workspace-choice" key={option}>
        <input type="radio" name={`${name}-${file.id}`} value={option} checked={value === option}
          onChange={() => onSelect(option)} />{options[option]}
      </label>
    )}</div>
  </FieldSet>;
}

export function EvidenceFileChecks({ file, files, busy, onChange, onInspect, onChoose, onTranslate }: {
  file: EvidenceFile; files: EvidenceFile[]; busy: boolean;
  onChange: (change: EvidenceDetailsChange) => void;
  onInspect: () => void; onChoose: () => void; onTranslate: () => void;
}) {
  const controls = useRef<HTMLFieldSetElement>(null);
  const issues = documentIssues(file, files);
  const reference = isReferenceFile(file, files);
  const parentOnFile = !!file.originalId && files.some(parent => parent.id === file.originalId && parent.referenceOnly);
  const original = file.role === "original";
  const image = documentMedia(file.name)?.startsWith("image/");
  function focusChoice(field: string) {
    controls.current?.querySelector<HTMLInputElement>(`input[name="${field}-${file.id}"]:checked`)?.focus();
  }
  return <fieldset ref={controls} disabled={busy} className="file-checks grid min-w-0 gap-3">
    <legend className="sr-only">{file.name} 的材料检查</legend>
    {reference ? <p className="workspace-meta">{parentOnFile ? "随对应原件留存，已移出递交检查。" : "仅供留存，已移出递交检查。"}</p> : <>
      {issues.length ? <>
        <p><strong>待处理 {issues.length} 项</strong></p>
        <ul className="file-check-list">{issues.map(issue => <li key={issue.code}>
          <span>{issue.message}</span>
          <Button type="button" size="sm" variant="link"
            aria-label={issue.code === "translationMissing" ? `为 ${file.name} 添加英文译本` : undefined} onClick={() => {
            switch (issue.code) {
              case "languageUnknown": focusChoice("language"); break;
              case "useUnknown": focusChoice("use"); break;
              case "translationMissing": onTranslate(); break;
              case "pdfUnknown":
              case "imageUnknown": onInspect(); break;
              default: onChoose();
            }
          }}>{issue.action}</Button>
        </li>)}</ul>
      </> : <p><strong>已通过材料检查</strong></p>}
      {original && <FieldGroup className="gap-3">
        {image && <FileChoice label="图片用途" file={file} name="use" options={uses}
          value={file.intendedUse} onSelect={intendedUse => onChange({ intendedUse })} />}
        {(!image || file.intendedUse === "document") && <FileChoice label="原件语言" file={file} name="language"
          options={languages} value={file.language} onSelect={language => onChange({ language })} />}
      </FieldGroup>}
    </>}
    <div className="flex flex-wrap gap-2">
      {original && !reference && !issues.some(issue => issue.code === "translationMissing") &&
        <Button type="button" variant="outline" size="sm" aria-label={`为 ${file.name} 添加英文译本`}
          onClick={onTranslate}>添加英文译本</Button>}
      {parentOnFile ? <Button type="button" size="sm" variant="link"
        onClick={() => document.getElementById(`file-${file.originalId}`)?.focus()}>查看对应原件</Button>
        : <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ referenceOnly: !file.referenceOnly })}>
          {file.referenceOnly ? "重新纳入递交检查" : "仅留存这份文件"}
        </Button>}
    </div>
  </fieldset>;
}
