import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { pilotAccessAllowed } from "../lib/assistant/access";
import { answerPilotQuestion, type PilotQuestion } from "../lib/assistant/pilot";
import { reviewedPassages } from "../lib/workspace/assistant-library";

const account = "user_internal";
const env = { VERCEL: "1", VERCEL_ENV: "preview", VERCEL_URL: "vber-fixture.vercel.app",
  OPENAI_API_KEY: "fixture", VBER_ASSISTANT_PILOT_USER_IDS: account };
const input: PilotQuestion = { draftId: randomUUID(), step: "evidence", question: "银行流水的英文译本应该放在哪里？", consent: true };
const passageId = "evidence.bank-translation";
const allowed = async () => "allowed" as const;
const never = async () => assert.fail("Unexpected call");

function response(id: string) {
  return Response.json({ status: "completed", output: [{ type: "message",
    content: [{ type: "output_text", text: JSON.stringify({ passageId: id }) }] }],
    usage: { input_tokens: 55, input_tokens_details: { cached_tokens: 0 }, output_tokens: 5 } });
}

test("only an allowlisted account on an Australian Vercel deployment can use the provider", async t => {
  const unreachable = t.mock.fn(never);
  const verified = new Headers({ host: env.VERCEL_URL, "x-vercel-ip-country": "AU" });
  assert.equal(pilotAccessAllowed(account, verified, env), true);
  const proxied = new Headers({ host: "proxy.example.test", "x-forwarded-host": env.VERCEL_URL, "x-vercel-ip-country": "AU" });
  assert.equal(pilotAccessAllowed(account, proxied, env), false);
  for (const [user, country, environment] of [
    [account, "CN", env], [account, null, env], [account, "US", env], [account, "AU,CN", env],
    ["other", "AU", env], ["", "AU", env], [account, "AU", { ...env, VERCEL: undefined }],
    [account, "AU", { ...env, VERCEL_ENV: "development" }], [account, "AU", { ...env, OPENAI_API_KEY: "" }],
  ] as const) {
    const headers = new Headers({ host: env.VERCEL_URL, "cf-ipcountry": "AU", "x-country": "AU", "accept-language": "en-AU" });
    if (country !== null) headers.set("x-vercel-ip-country", country);
    const enabled = pilotAccessAllowed(user, headers, environment);
    assert.equal(enabled, false);
    const reply = await answerPilotQuestion(input, enabled, unreachable, unreachable);
    assert.equal(reply.kind, "library");
    assert.equal(reply.passageIds[0], passageId);
  }
  assert.equal((await answerPilotQuestion({ ...input, consent: false }, true, unreachable, unreachable)).kind, "library");
  assert.equal((await answerPilotQuestion({ ...input, draftId: "bad" }, true, unreachable, unreachable)).kind, "invalid");
  assert.equal((await answerPilotQuestion({ ...input, question: "x".repeat(501) }, true, unreachable, unreachable)).kind, "invalid");
  assert.equal(unreachable.mock.callCount(), 0);
});

test("redacted follow-ups send only allowed topics and render a vetted citation", async t => {
  const log = t.mock.method(console, "info", () => {});
  const synthetic = "姓名 王小莲，邮箱 lisa@example.test，护照 EX9239480，电话 0406 123 567。";
  const result = await answerPilotQuestion({ ...input, question: synthetic + input.question,
    previousPassageId: "evidence.translations" }, true, async charge => {
    assert.equal(charge, true);
    return "allowed";
  }, async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    const payload = JSON.parse(String(init?.body));
    assert.equal(payload.store, false);
    assert.ok(init?.signal);
    assert.doesNotMatch(JSON.stringify(payload), /王小莲|lisa|9239480|0406|123 567/);
    assert.equal(JSON.stringify(payload).includes(input.draftId), false);
    const body = JSON.parse(payload.input);
    assert.equal(body.previousId, "evidence.translations");
    assert.match(body.question, /流水/);
    return response(passageId);
  });
  assert.deepEqual(result, { kind: "answered", passageIds: [passageId] });
  const [event, metrics] = log.mock.calls[0].arguments;
  assert.equal(event, "assistant_pilot_request");
  assert.equal(metrics.providerCalls, 1);
  assert.equal(metrics.answered, 1);
  assert.equal(metrics.estimatedCostUsd, (55 * 0.20 + 5 * 1.20) / 1_000_000);
  assert.doesNotMatch(JSON.stringify(metrics), /王小莲|lisa|流水|护照|user_internal/);
});

test("quota, stale ownership, provider timeout, incomplete and invented answers return reviewed suggestions", async t => {
  t.mock.method(console, "info", () => {});
  const unreachable = t.mock.fn(never);
  for (const reason of ["quota", "unavailable"] as const) {
    const result = await answerPilotQuestion(input, true, async () => reason, unreachable);
    assert.equal(result.kind, reason);
  }
  for (const send of [async () => { throw new Error("timeout"); }, async () => response("fabricated"),
    async () => response("none"), async () => Response.json({ status: "incomplete", output: [] }),
    async () => Response.json({ status: "completed", output: [] }),
    async () => Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "refusal" }] }] })]) {
    const result = await answerPilotQuestion(input, true, allowed, send);
    assert.equal(result.kind, "library");
    assert.equal(result.passageIds[0], passageId);
    assert.ok(result.passageIds.every(id => reviewedPassages.some(p => p.id === id && p.source)));
  }
  const result = await answerPilotQuestion({ ...input, question: "企鹅饲养手册" }, true, allowed, unreachable);
  assert.equal(result.kind, "library");
  assert.ok(result.passageIds.length > 0);
  const followup = await answerPilotQuestion({ ...input, question: "企鹅饲养手册", previousPassageId: passageId }, true, allowed, unreachable);
  assert.equal(followup.kind, "library");
  assert.equal(unreachable.mock.callCount(), 0);
});

test("status, current rules and personal advice use reviewed referrals without a provider call", async t => {
  t.mock.method(console, "info", () => {});
  for (const [question, id] of [["我的申请进度如何", "aftercare.status"], ["存款够不够", "assistance.personal"],
    ["今年的签证费是多少", "current.fees"]]) {
    const reply = await answerPilotQuestion({ ...input, question }, true, async charge => {
      assert.equal(charge, false);
      return "allowed";
    }, never);
    assert.deepEqual(reply, { kind: "answered", passageIds: [id] });
  }
});
