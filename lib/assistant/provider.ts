import "server-only";
import { reviewedPassages, type ReviewedPassage } from "../workspace/assistant-library";
import type { Step } from "../workspace/model";

const model = "gpt-5.6-luna";
const questionWords = [
  "需要", "不需要", "为什么", "可以", "不可以", "一定", "如何", "怎么", "哪里", "哪个", "哪些", "多少",
  "一起", "分别", "单独", "先", "之后", "之前", "必须", "只有", "如果", "没有", "还要", "也要",
  "刚才", "上面", "这个", "那个", "它们", "怎么办", "下一步", "重新", "更换", "修改", "补充",
  "原件", "英文版", "英文", "中文", "添加", "关联", "配对", "合并", "拆开", "保存", "文件", "附件",
  "材料", "上传", "删除", "重传", "解密", "加密", "签字", "提交", "打印", "核对", "填写", "格式",
  "照片", "扫描件", "两份", "多个", "同一个", "顺序", "先后", "每份", "能否", "是否", "还需要",
];
const vocabulary = [...new Set([...questionWords, ...reviewedPassages.flatMap(p => p.keywords)])]
  .filter(Boolean).sort((a, b) => b.length - a.length);

// Reconstruct the question from public vocabulary. Free-form names, addresses, identifiers and
// pasted documents never become part of the payload, including formats a PII regex might miss.
export function redactAssistantQuestion(question: string) {
  const words: string[] = [];
  const normalized = question.normalize("NFKC").toLowerCase();
  for (let i = 0; i < normalized.length;) {
    const match = vocabulary.find(word => normalized.startsWith(word.toLowerCase(), i));
    if (match) {
      words.push(match);
      i += match.length;
    } else {
      i++;
    }
  }
  return words.join(" ");
}

type Usage = {
  input_tokens: number;
  output_tokens: number;
  input_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number;
    cache_write_tokens_details?: { ttl_12h_tokens?: number } };
};
interface ProviderResponse {
  status?: string;
  service_tier?: string;
  usage?: Usage;
  output?: { type: string; content?: { type: string; text?: string }[] }[];
}

function usageMetrics(usage?: Usage, serviceTier?: string) {
  if (!usage) return null;
  const input = usage.input_tokens;
  const output = usage.output_tokens;
  const cached = usage.input_tokens_details?.cached_tokens ?? 0;
  const writes = usage.input_tokens_details?.cache_write_tokens ?? 0;
  const extendedWrites = usage.input_tokens_details?.cache_write_tokens_details?.ttl_12h_tokens ?? 0;
  if (![input, output, cached, writes, extendedWrites].every(v => Number.isSafeInteger(v) && v >= 0)
      || cached + writes > input || extendedWrites > writes) return null;
  // Standard short-context USD rates per million tokens for the fixed pilot model.
  const usd = ((input - cached - writes) * 0.20 + cached * 0.02 + (writes - extendedWrites) * 0.25
    + extendedWrites * 0.50 + output * 1.20) / 1_000_000;
  return { inputTokens: input, outputTokens: output,
    estimatedCostUsd: !serviceTier || serviceTier === "default" ? usd : null };
}

export async function selectReviewedPassage(step: Step, redactedQuestion: string, previousId: string | undefined,
  passages: ReviewedPassage[], send: typeof fetch = fetch) {
  const ids = passages.map(p => p.id);
  const response = await send("https://api.openai.com/v1/responses", {
    method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000),
    headers: { Authorization: "Bearer " + process.env.OPENAI_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      model, store: false, service_tier: "default", reasoning: { effort: "none" }, max_output_tokens: 128,
      instructions: "Select the one reviewed Mandarin passage that fully answers the question, or none. "
        + "The question contains only approved topic and question words after redaction. "
        + "An ambiguous, unrelated or case-specific question requires none. Do not infer missing facts. "
        + "Use the previous topic only to resolve a follow-up. Return a passage ID, without new guidance.",
      input: JSON.stringify({ step, question: redactedQuestion, previousId,
        passages: passages.map(({ id, question, answer, sourceSection }) => ({ id, question, answer, sourceSection })) }),
      text: { format: { type: "json_schema", name: "reviewed_answer", strict: true, schema: {
        type: "object", additionalProperties: false, required: ["passageId"],
        properties: { passageId: { type: "string", enum: ["none", ...ids] } },
      } } },
    }),
  });
  if (!response.ok) throw new Error("assistant_provider_unavailable");
  const result: ProviderResponse = await response.json();
  const usage = usageMetrics(result.usage, result.service_tier);
  const message = result.output?.find(item => item.type === "message");
  const content = message?.content?.find(item => item.type === "output_text");
  let passageId: string | null = null;
  if (result.status === "completed" && content?.text) {
    try {
      const selected: unknown = JSON.parse(content.text)?.passageId;
      if (typeof selected === "string" && ids.includes(selected)) passageId = selected;
    } catch { /* Treat malformed output like an unanswered question. */ }
  }
  return { passageId, usage };
}
