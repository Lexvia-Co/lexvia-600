export const GUIDE_VERSION = "2026-11-27";
// Editorial reviews do not invalidate letters whose underlying English text is unchanged.
const TEMPLATE_VERSION = "2026-11-26";
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
  citizenship: "国籍", residence: "常住国家或地区", email: "联系邮箱", passportExpiry: "护照到期日期",
  purpose: "赴澳目的", arrivalDate: "抵澳日期", departureDate: "离澳日期",
  destinations: "想去的地方和想做的事", accommodation: "住宿安排", travelHistory: "以往出境记录",
  hostName: "邀请人姓名", hostRelationship: "你和邀请人的关系", hostAddress: "邀请人在澳大利亚的地址",
  payer: "这次旅行谁付费", fundingDetails: "预计花费和资金来源", occupation: "目前的工作或学习情况", returnTies: "回国后的安排",
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

export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

const missingAnswer: Record<Exclude<AnswerKey, "givenNames" | "familyName">, string> = {
  birthDate: "请填写你的出生日期。",
  citizenship: "请填写你的国籍。",
  residence: "请填写你平时居住的国家或地区。",
  email: "请填写你的联系邮箱。",
  passportExpiry: "请填写护照的到期日期。",
  purpose: "请选择旅游度假或探亲访友。",
  arrivalDate: "请填写你计划抵达澳大利亚的日期。",
  departureDate: "请填写你计划离开澳大利亚的日期。",
  destinations: "请写下你打算去哪里、做些什么。",
  accommodation: "请写下你打算住在哪里。",
  travelHistory: "请写下以往的出境记录。如果没有，请填“无”。",
  hostName: "请填写邀请人的姓名。",
  hostRelationship: "请写下你和邀请人是什么关系。",
  hostAddress: "请填写邀请人在澳大利亚的地址。",
  payer: "请选择由谁支付这次旅行的费用。",
  fundingDetails: "请写下预计要花多少钱，以及这些钱从哪里来。",
  occupation: "请写下你现在的工作、学习或其他情况。",
  returnTies: "请写下你回国后有哪些安排。",
};

export function validateStep(step: Step, answers: Answers, today = new Date()): Partial<Record<AnswerKey, string>> {
  const errors: Partial<Record<AnswerKey, string>> = {};
  for (const key of STEP_FIELDS[step]) {
    if (key.startsWith("host") && answers.purpose !== "visit") continue;
    // A passport can have a single name. At least one name field must match it.
    if (key === "givenNames" || key === "familyName") continue;
    if (!answers[key].trim()) errors[key] = missingAnswer[key];
  }
  if (step === "identity") {
    const localDate = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(today);
    if (!answers.givenNames.trim() && !answers.familyName.trim()) errors.familyName = "请按护照填写姓名。";
    if (answers.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email.trim())) errors.email = "请填写完整的邮箱地址，例如 name@example.com。";
    if (answers.birthDate) {
      const cutoff = String(Number(localDate.slice(0, 4)) - 18) + localDate.slice(4);
      if (!validDate(answers.birthDate)) errors.birthDate = "请输入有效的出生日期。";
      else if (answers.birthDate > cutoff) errors.birthDate = "请核对出生日期。VBER 目前只提供成人本人的申请草稿。";
    }
    if (answers.passportExpiry) {
      if (!validDate(answers.passportExpiry)) errors.passportExpiry = "请输入有效的护照到期日期。";
      else if (validDate(answers.birthDate) && answers.passportExpiry < answers.birthDate) {
        errors.passportExpiry = "护照到期日期早于出生日期，请核对这两个日期。";
      } else if (answers.passportExpiry < localDate) {
        errors.passportExpiry = "这本护照已过期，请核对有效护照上的到期日期。";
      }
    }
  }
  if (step === "visit") {
    if (!["holiday", "visit"].includes(answers.purpose)) errors.purpose = missingAnswer.purpose;
    for (const key of ["arrivalDate", "departureDate"] as const) {
      if (answers[key] && !validDate(answers[key])) errors[key] = "请输入有效的日期。";
    }
    if (validDate(answers.arrivalDate) && validDate(answers.departureDate) && answers.departureDate < answers.arrivalDate) {
      errors.departureDate = "离澳日期不能早于抵澳日期。";
    }
  }
  if (step === "funding" && !["self", "host", "other", "shared"].includes(answers.payer)) errors.payer = missingAnswer.payer;
  return errors;
}

const evidence = {
  passport: { title: "护照个人资料页", description: "准备当前护照的彩色扫描件或照片。照片、个人资料、签发日期和到期日期都要看得清。", source: OFFICIAL.stream },
  trip: { title: "旅行计划", description: "写清为什么去澳大利亚、准备去哪里、待多久。可以用一份行程单说明。", source: OFFICIAL.visitor },
  finances: { title: "旅行资金", description: "准备能说明你付得起这次旅行费用的材料，例如近期银行对账单。", source: OFFICIAL.visitor },
  return: { title: "回国安排", description: "哪些材料能说明你会按时离开澳大利亚？例如，上班的人可以提供单位的准假信，学生可以提供在读证明。", source: OFFICIAL.visitor },
  history: { title: "以往旅行记录", description: "列出去过的国家或地区、出发的大致时间，以及每次停留了多久。", source: OFFICIAL.visitor },
  invitation: { title: "亲友邀请信", description: "请亲友在信里写明你们的关系、这次探访的原因、你住在哪里，以及他们是否会出钱或提供其他帮助。", source: OFFICIAL.visitor },
  support: { title: "他人出资证明", description: "写清谁会帮你支付哪些费用。如果邀请人出钱，可以附上对方近期的银行对账单等证明。", source: OFFICIAL.visitor },
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

export const TEMPLATE_LABELS = { itinerary: "行程单", invitation: "亲友邀请信", employment: "在职与准假证明" } as const;
export type TemplateKind = keyof typeof TEMPLATE_LABELS;
// An invitation can combine nine 4,000-character answers with its headings and signature block.
export const MAX_TEMPLATE_LENGTH = 40_000;
export const TEMPLATE_REVIEW_NOTICE = "请对照最新的申请信息，看看这份文稿里有没有需要改的地方。";

const tripPurposes: Record<string, string> = { holiday: "Holiday", visit: "Visiting family or friends" };
const tripPayers: Record<string, string> = {
  self: "The applicant", host: "The host in Australia", other: "Another person", shared: "Shared costs",
};

export function templateText(kind: TemplateKind, a: Answers): string {
  const name = [a.givenNames, a.familyName].map(v => v.trim()).filter(Boolean).join(" ") || "[Applicant name as in passport]";
  const field = (key: AnswerKey, placeholder: string) => {
    const value = a.purpose === "holiday" && key.startsWith("host") ? "" : a[key].trim();
    return value || "[" + placeholder + "]";
  };
  const dates = field("arrivalDate", "Arrival date") + " to " + field("departureDate", "Departure date");
  const purpose = "Purpose of travel: " + (tripPurposes[a.purpose] ?? "[Purpose of travel]");
  const payer = "Who will cover the trip costs: " + (tripPayers[a.payer] ?? "[Who will pay]");
  if (kind === "itinerary") return [
    "Travel itinerary", "Applicant: " + name, purpose, "Dates: " + dates,
    "Places and planned activities: " + field("destinations", "Enter your actual plans"),
    "Accommodation: " + field("accommodation", "Accommodation plans"),
    payer, "Trip funding: " + field("fundingDetails", "Who will pay and which costs they will cover"),
  ].join("\n\n");
  if (kind === "invitation") return [
    "Letter of invitation", "Date: [Date signed]", "Dear Visa Officer,",
    "I, " + field("hostName", "Host name") + ", invite " + name + " to Australia from " + dates + ".", purpose,
    "Relationship to applicant: " + field("hostRelationship", "Relationship"),
    "My address in Australia: " + field("hostAddress", "Host address"),
    "Accommodation: " + field("accommodation", "Accommodation plans"),
    payer, "Financial arrangements: " + field("fundingDetails", "State any support provided"),
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
  return TEMPLATE_VERSION + "-" + (hash >>> 0).toString(16);
}
