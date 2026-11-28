import { OFFICIAL, type Step } from "./model";

export type ReviewedPassage = {
  id: string;
  question: string;
  answer: string;
  source: string;
  sourceSection: string;
  reviewed: string;
  step: Step;
  anchor: string;
  action: string;
  keywords: readonly string[];
  kind: "guide" | "referral" | "status" | "current";
};

const reviewed = "2026-11-28";
const officialHelp = "https://immi.homeaffairs.gov.au/help-support/who-can-help-with-your-application/overview";

export const reviewedPassages: readonly ReviewedPassage[] = [
  {
    id: "evidence.bank-translation", step: "evidence", anchor: "evidence-finances", action: "打开旅行资金材料",
    question: "银行流水的英文译本应该放在哪里？",
    answer: "在「证明材料」展开「旅行资金」，先上传银行流水原件。找到这份原件，点「添加英文译本」，选好文件后点「上传所选文件」。有几份流水就分别关联。递交非英文材料时，Home Affairs 要求同时提供原件和英文译本。",
    source: OFFICIAL.visitor, sourceSection: "访客材料 · 英文译本", reviewed, kind: "guide",
    keywords: ["流水译本", "对账单译本", "流水翻译", "账单翻译"],
  },
  {
    id: "evidence.translations", step: "evidence", anchor: "evidence-passport", action: "打开证明材料",
    question: "中文材料要和译本一起交吗？",
    answer: "Home Affairs 要求非英文材料附英文译本，并同时递交原件。先在对应材料类别上传原件，再在该文件下点「添加英文译本」。",
    source: OFFICIAL.visitor, sourceSection: "访客材料 · 英文译本", reviewed, kind: "guide",
    keywords: ["译本", "翻译", "中文材料", "英文材料", "非英文", "中文原件", "译文"],
  },
  {
    id: "evidence.bank-statements", step: "evidence", anchor: "evidence-finances", action: "整理旅行资金材料",
    question: "可以用哪些材料说明旅行费用由我承担？",
    answer: "例如，可以提供近期银行对账单或收入证明，说明自己有足够的资金支付在澳期间的开支。在「旅行资金」上传这些材料，再核对自己 ImmiAccount 里的清单。",
    source: OFFICIAL.visitor, sourceSection: "访客材料 · 旅行资金", reviewed, kind: "guide",
    keywords: ["流水", "对账单", "收入证明", "资金", "存款", "自己付", "自己承担", "自费"],
  },
  {
    id: "evidence.checklist", step: "evidence", anchor: "evidence-passport", action: "查看草稿材料清单",
    question: "递交前要核对哪份材料清单？",
    answer: "请在自己的 ImmiAccount 申请表中核对要求的文件。VBER 的清单方便整理草稿。遇到无法提供的指定材料，请在申请中解释原因，并提供手头其他相关证明。",
    source: OFFICIAL.visitor, sourceSection: "访客材料 · 按个人清单上传", reviewed, kind: "guide",
    keywords: ["清单", "缺材料", "缺一份", "无法提供", "没有这份", "材料不齐", "所有材料", "材料齐全"],
  },
  {
    id: "evidence.return", step: "funding", anchor: "returnTies", action: "填写回国后的安排",
    question: "可以怎样说明旅行后会按时回国？",
    answer: "按实际情况写下回国后的安排。例如，受雇人士可提供单位准假信，学生可提供在读证明。相应文件可在「证明材料」的「回国安排」中整理。",
    source: OFFICIAL.visitor, sourceSection: "访客材料 · 离澳安排", reviewed, kind: "guide",
    keywords: ["回国", "按时离开", "在读证明", "准假", "返岗", "返校"],
  },
  {
    id: "visit.itinerary", step: "visit", anchor: "destinations", action: "填写想去的地方和想做的事",
    question: "旅行计划里可以写些什么？",
    answer: "说明赴澳目的、想做的事和预计停留时间。你可以在「赴澳安排」写下准备去的城市、活动和日期，再到「文书草稿」整理行程单。",
    source: OFFICIAL.visitor, sourceSection: "访客材料 · 说明旅行目的", reviewed, kind: "guide",
    keywords: ["行程", "旅行计划", "活动", "去哪", "想去", "旅游目的"],
  },
  {
    id: "visit.history", step: "visit", anchor: "travelHistory", action: "填写以往出境记录",
    question: "以前的旅行记录该写什么？",
    answer: "列出去过哪些国家或地区、什么时候去的、每次停留了多久。在「赴澳安排」的「以往出境记录」按实际情况填写。",
    source: OFFICIAL.visitor, sourceSection: "访客材料 · 以往旅行记录", reviewed, kind: "guide",
    keywords: ["旅行记录", "旅行史", "旅行历史", "出入境", "出境", "去过", "以前去"],
  },
  {
    id: "templates.invitation", step: "templates", anchor: "invitation", action: "打开亲友邀请信草稿",
    question: "探亲访友的邀请信里写什么？",
    answer: "请邀请人说明你们的关系、来访目的、住宿安排，以及是否提供费用或其他帮助。打开「文书草稿」里的「亲友邀请信」，按实际情况补全后交给邀请人核对。",
    source: OFFICIAL.visitor, sourceSection: "访客材料 · 探访亲友", reviewed, kind: "guide",
    keywords: ["邀请信", "邀请函", "邀请人", "探亲", "访友"],
  },
  {
    id: "identity.passport-name", step: "identity", anchor: "familyName", action: "核对护照上的姓和名",
    question: "草稿里的姓和名在哪里改？",
    answer: "到「个人信息」对照护照核对姓和名，保留护照上的拼写，再点「保存草稿」。最后可在「核对与递交」逐项复制。",
    source: OFFICIAL.visitor, sourceSection: "递交前核对 · 回答是否准确", reviewed, kind: "guide",
    keywords: ["护照姓名", "护照名字", "护照上的姓", "姓名", "姓和名", "拼写", "拼音", "family name", "given names"],
  },
  {
    id: "visit.dates", step: "visit", anchor: "arrivalDate", action: "核对抵澳及离澳日期",
    question: "在哪里改抵澳和离澳日期？",
    answer: "在「赴澳安排」找到「抵澳日期」和「离澳日期」，核对年月日后保存。回到「核对与递交」就能看到保存的日期。",
    source: OFFICIAL.visitor, sourceSection: "递交前核对 · 回答是否准确", reviewed, kind: "guide",
    keywords: ["抵澳日期", "离澳日期", "抵澳", "离澳", "出发日期", "出行日期", "到达日期", "旅行日期", "往返日期", "回程日期"],
  },
  {
    id: "review.handoff", step: "review", anchor: "handoff", action: "打开双语递交材料包",
    question: "怎样把草稿里的答案和附件带到 ImmiAccount？",
    answer: "在「核对与递交」复制需要的答案，下载所选材料并解压。按目录找到同一编号的原件和英文译本，再登录 ImmiAccount，逐份添加申请表要求的文件。请保留本地副本，上传后无法从 ImmiAccount 取回附件。",
    source: OFFICIAL.attachments, sourceSection: "网上申请 · 上传文件和保留副本", reviewed, kind: "guide",
    keywords: ["材料包", "压缩包", "解压", "zip", "打包", "导出", "复制", "下载", "递交附件", "带到"],
  },
  {
    id: "aftercare.status", step: "aftercare", anchor: "aftercare-immi", action: "前往递交后的 ImmiAccount 入口",
    question: "怎么查我这份申请的进度？",
    answer: "登录递交申请时使用的 ImmiAccount，打开对应申请查看状态和通知。VBER 只能显示草稿的准备情况。",
    source: "https://immi.homeaffairs.gov.au/help-support/tools/digital-assistant", sourceSection: "官方助手 · 查询个人申请进度", reviewed, kind: "status",
    keywords: ["状态", "进度", "审到哪", "查到哪", "处理到哪", "办到哪", "轮到我", "我什么时候出签", "什么时候能出签", "我的申请到", "有结果", "下签了吗", "批了吗", "受理了吗", "补件通知", "催签", "什么时候批我", "我的签证什么时候", "几号出签", "审理到哪"],
  },
  {
    id: "current.processing", step: "aftercare", anchor: "aftercare-immi", action: "查看递交后的安排",
    question: "在哪里看最新的审理时间？",
    answer: "在 Home Affairs 的审理时间工具里选择签证类别和 stream。页面根据近期已处理的申请给出估计，个人申请的决定日期可能不同。",
    source: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times/global-visa-processing-times", sourceSection: "签证审理时间工具", reviewed, kind: "current",
    keywords: ["审理时间", "处理时间", "审理多久", "要等多久", "要等几天", "等多久", "多久能办好", "多久能下来", "多久能下签", "处理周期", "通常多久", "多久下签"],
  },
  {
    id: "current.fees", step: "review", anchor: "handoff", action: "返回递交准备",
    question: "今年的申请费在哪里查？",
    answer: "申请费可能调整。打开 Home Affairs 的费用页面，使用 Visa pricing estimator 或查看当前收费表，按自己的签证类别核对金额。",
    source: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/fees-and-charges", sourceSection: "签证费用与估算工具", reviewed, kind: "current",
    keywords: ["申请费", "签证费", "费用涨", "收费", "收费表", "价格", "多少钱", "涨价", "交多少钱"],
  },
  {
    id: "current.rules", step: "review", anchor: "handoff", action: "返回递交准备",
    question: "哪里可以核对最新的 Tourist stream 要求？",
    answer: "如果你在澳大利亚境外申请 Visitor visa (subclass 600) 的 Tourist stream，请打开这个 stream 的 Home Affairs 页面核对当时适用的要求。",
    source: OFFICIAL.stream, sourceSection: "Tourist stream（澳大利亚境外申请）", reviewed, kind: "current",
    keywords: ["新规", "新规定", "新政策", "政策变", "最新要求", "要求变", "最新规定", "现在的规定", "政策更新", "最新政策"],
  },
  {
    id: "assistance.personal", step: "aftercare", anchor: "aftercare-immi", action: "查看递交后的安排",
    question: "谁可以就我的个人情况提供申请建议？",
    answer: "请查看 Home Affairs 关于 immigration assistance 的说明，再选择能就个人情况提供帮助的人，例如 registered migration agent 或 legal practitioner。准备助手可以帮你找公开指引。",
    source: officialHelp, sourceSection: "谁可以提供 immigration assistance", reviewed, kind: "referral",
    keywords: ["专业建议", "个人建议", "个人情况", "个案", "代理", "律师", "移民顾问", "获签率", "成功率", "过签率", "拒签", "稳过", "包过", "更容易过", "提高获签", "怎么解释", "怎么包装", "怎么选签证", "该选哪", "够不够", "能过", "能获签", "会被拒", "能不能过", "稳不稳", "帮我判断", "获批几率", "通过率", "通过概率", "通过的概率", "过的概率", "能不能获批", "怎么才能获批", "有希望获签", "能下签吗", "资金要多少才", "存款要多少才", "要存多少才", "对我有利", "我该怎么办", "适合我", "胜算", "隐瞒", "美化"],
  },
];

function normalize(text: string) {
  return text.normalize("NFKC").toLowerCase().replace(/[\s\p{P}]+/gu, "");
}

export function searchPassages(question: string, step: Step): ReviewedPassage[] {
  const query = normalize(question);
  if (!query) return question.trim() ? [] : reviewedPassages.filter(passage => passage.step === step);

  const translatedBankFile = /流水|银行|对账单/.test(query) && /翻译|译本|译文/.test(query);
  return reviewedPassages.map(passage => {
    const terms = passage.keywords.map(normalize);
    let score = terms.reduce((sum, term) => sum + (query.includes(term) ? term.length : 0), 0);
    if (translatedBankFile && passage.id === "evidence.bank-translation") score += 50;
    if (score > 0 && passage.kind === "referral") score += 200;
    if (score > 0 && passage.kind === "status") score += 100;
    if (normalize(passage.question).includes(query) && query.length >= 2) score += query.length;
    if (score > 0 && passage.step === step) score += 0.5;
    return { passage, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).map(item => item.passage);
}
