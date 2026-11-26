export const GUIDE_VERSION = "2026-11-26";
export const OFFICIAL = {
  stream: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600/tourist-stream-overseas",
  visitor: "https://immi.homeaffairs.gov.au/check-twice-submit-once/visitor-visa",
  attachments: "https://immi.homeaffairs.gov.au/help-support/applying-online-or-on-paper/online/attach-documents-to-your-application",
  immi: "https://online.immi.gov.au/lusc/login",
  onshore: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600/tourist-stream-onshore",
  finder: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-finder",
} as const;

export const STEPS = ["identity", "visit", "funding", "evidence", "templates", "review", "aftercare"] as const;
export type Step = typeof STEPS[number];
export const STEP_LABELS: Record<Step, string> = {
  identity: "个人信息", visit: "赴澳安排", funding: "费用与回国安排",
  evidence: "证明材料", templates: "文书草稿", review: "核对与递交", aftercare: "递交之后",
};

export const ANSWER_LABELS = {
  givenNames: "护照上的名", familyName: "护照上的姓", birthDate: "出生日期",
  citizenship: "国籍", residence: "常住国家或地区", email: "联系邮箱", passportExpiry: "护照有效期至",
  purpose: "赴澳目的", arrivalDate: "计划抵澳日期", departureDate: "计划离澳日期",
  destinations: "计划前往的地点及活动", accommodation: "住宿安排", travelHistory: "以往出境记录",
  hostName: "邀请人姓名", hostRelationship: "与邀请人的关系", hostAddress: "邀请人在澳地址",
  payer: "谁承担本次费用", fundingDetails: "费用和资金来源", occupation: "工作或学习情况", returnTies: "回国后的安排",
} as const;
export type Answers = Record<keyof typeof ANSWER_LABELS, string>;
export type AnswerKey = keyof Answers;
export const STEP_FIELDS: Record<Step, AnswerKey[]> = {
  identity: ["givenNames", "familyName", "birthDate", "citizenship", "residence", "email", "passportExpiry"],
  visit: ["purpose", "arrivalDate", "departureDate", "destinations", "accommodation", "travelHistory", "hostName", "hostRelationship", "hostAddress"],
  funding: ["payer", "fundingDetails", "occupation", "returnTies"],
  evidence: [], templates: [], review: [], aftercare: [],
};

export function normalizeAnswers(input: unknown): Answers {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const answers = {} as Answers;
  for (const key of Object.keys(ANSWER_LABELS) as AnswerKey[]) {
    const value = record[key];
    answers[key] = typeof value === "string" ? value : "";
  }
  return answers;
}

export function emptyAnswers(): Answers {
  return normalizeAnswers(null);
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function validateStep(step: Step, answers: Answers, today = new Date()): Partial<Record<AnswerKey, string>> {
  const errors: Partial<Record<AnswerKey, string>> = {};
  for (const key of STEP_FIELDS[step]) {
    if (key.startsWith("host") && answers.purpose !== "visit") continue;
    // A passport can have a single name. At least one name field must match it.
    if (key === "givenNames" || key === "familyName") continue;
    if (!answers[key].trim()) errors[key] = "请填写" + ANSWER_LABELS[key] + "。";
  }
  if (step === "identity") {
    if (!answers.givenNames.trim() && !answers.familyName.trim()) errors.familyName = "请按护照填写姓名。";
    if (answers.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email.trim())) errors.email = "请检查邮箱地址。";
    if (answers.birthDate) {
      const localDate = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
      }).format(today);
      const cutoff = String(Number(localDate.slice(0, 4)) - 18) + localDate.slice(4);
      if (!validDate(answers.birthDate)) errors.birthDate = "请输入有效的出生日期。";
      else if (answers.birthDate > cutoff) errors.birthDate = "本工作区供年满 18 岁的申请人准备自己的申请。";
    }
    if (answers.passportExpiry && !validDate(answers.passportExpiry)) errors.passportExpiry = "请输入有效的日期。";
  }
  if (step === "visit") {
    if (!["holiday", "visit"].includes(answers.purpose)) errors.purpose = "请选择旅游或探亲访友。";
    for (const key of ["arrivalDate", "departureDate"] as const) {
      if (answers[key] && !validDate(answers[key])) errors[key] = "请输入有效的日期。";
    }
    if (validDate(answers.arrivalDate) && validDate(answers.departureDate) && answers.departureDate < answers.arrivalDate) {
      errors.departureDate = "离澳日期不能早于抵澳日期。";
    }
  }
  if (step === "funding" && !["self", "host", "other", "shared"].includes(answers.payer)) errors.payer = "请选择费用承担方式。";
  return errors;
}

const evidence = {
  passport: { title: "护照身份页", description: "准备清晰的护照身份页，以便核对姓名、出生日期及护照信息。", source: OFFICIAL.stream },
  trip: { title: "旅行计划", description: "说明旅行目的、日期、地点和住宿。例如，你可以提供行程单。", source: OFFICIAL.visitor },
  finances: { title: "旅行资金", description: "说明在澳期间费用如何支付。例如，你可以提供近期银行对账单。", source: OFFICIAL.visitor },
  return: { title: "回国安排", description: "根据自身情况准备说明，例如单位准假信、在读证明或家庭责任的材料。", source: OFFICIAL.visitor },
  history: { title: "以往旅行记录", description: "核对去过的国家、时间和停留时长。如有相关记录，可整理签证或出入境记录。", source: OFFICIAL.visitor },
  invitation: { title: "亲友邀请信", description: "你选择了探亲访友。请邀请人说明你们的关系、来访目的、停留时间和住宿安排。", source: OFFICIAL.visitor },
  support: { title: "他人承担费用的证明", description: "你填写了由他人承担或分担费用。可说明由谁支付、承担哪些开支，并准备相应证明。", source: OFFICIAL.visitor },
} as const;
export type EvidenceKey = keyof typeof evidence;
export type EvidenceRule = { key: EvidenceKey; title: string; description: string; source: string; reviewed: string };
export const EVIDENCE_LABELS: Record<string, string> = Object.fromEntries(Object.entries(evidence).map(([key, rule]) => [key, rule.title]));
export function evidenceFor(answers: Answers): EvidenceRule[] {
  const keys: EvidenceKey[] = ["passport", "trip", "finances", "return", "history"];
  if (answers.purpose === "visit") keys.push("invitation");
  if (["host", "shared", "other"].includes(answers.payer)) keys.push("support");
  return keys.map(key => ({key, ...evidence[key], reviewed: GUIDE_VERSION}));
}

export const TEMPLATE_LABELS = { itinerary: "旅行行程单", invitation: "亲友邀请信", employment: "在职与准假证明" } as const;
export type TemplateKind = keyof typeof TEMPLATE_LABELS;

export function templateText(kind: TemplateKind, a: Answers): string {
  const name = [a.givenNames, a.familyName].map(v => v.trim()).filter(Boolean).join(" ") || "[Applicant name as in passport]";
  const field = (key: AnswerKey, placeholder: string) => a[key].trim() || "[" + placeholder + "]";
  const dates = field("arrivalDate", "Arrival date") + " to " + field("departureDate", "Departure date");
  if (kind === "itinerary") return [
    "Travel itinerary", "Applicant: " + name, "Dates: " + dates,
    "Places and planned activities: " + field("destinations", "Enter your actual plans"),
    "Accommodation: " + field("accommodation", "Accommodation plans"),
    "Trip funding: " + field("fundingDetails", "Who will pay and which costs they will cover"),
  ].join("\n\n");
  if (kind === "invitation") return [
    "Letter of invitation", "Date: [Date signed]", "Dear Visa Officer,",
    "I, " + field("hostName", "Host name") + ", invite " + name + " to visit me in Australia from " + dates + ".",
    "Relationship to applicant: " + field("hostRelationship", "Relationship"),
    "My address in Australia: " + field("hostAddress", "Host address"),
    "Accommodation: " + field("accommodation", "Accommodation plans"),
    "Financial arrangements: " + field("fundingDetails", "State any support provided"),
    "Host contact details: [Telephone or email]", "Signature: [Host to confirm and sign]",
  ].join("\n\n");
  return [
    "Employment and leave confirmation", "Date: [Date signed]", "Dear Visa Officer,",
    "Employee: " + name, "Employer: [Employer’s name and contact details]", "Position: [Position confirmed by employer]",
    "Proposed travel dates: " + dates, "Approved leave dates: [Employer to confirm]",
    "Expected return to work: [Employer to confirm]", "Name, position and signature: [Authorised employer representative]",
  ].join("\n\n");
}

// A content fingerprint flags source changes without storing a second copy of the letter.
export function templateFingerprint(kind: TemplateKind, answers: Answers): string {
  const text = templateText(kind, answers);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return GUIDE_VERSION + "-" + (hash >>> 0).toString(16);
}
