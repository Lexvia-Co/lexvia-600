import { deepEqual, equal, match, notEqual, ok } from "node:assert/strict";
import test from "node:test";
import {
  ANSWER_LABELS, MAX_TEMPLATE_LENGTH, TEMPLATE_LABELS, emptyAnswers, evidenceFor, normalizeAnswers, templateFingerprint, templateText,
  validateStep, type TemplateKind,
} from "../lib/workspace/model";

test("evidence follows visit purpose independently of the person covering expenses", () => {
  const keys = (purpose: string, payer: string) => evidenceFor({ ...emptyAnswers(), purpose, payer }).map(item => item.key);
  const basic = keys("holiday", "self");
  deepEqual(keys("visit", "self"), [...basic, "invitation"]);
  deepEqual(keys("visit", "host"), [...basic, "invitation", "support"]);
  deepEqual(keys("holiday", "other"), [...basic, "support"]);
  ok(evidenceFor(emptyAnswers()).every(rule => rule.source.startsWith("https://immi.homeaffairs.gov.au/") && rule.reviewed));
});

test("partial identity answers round trip and validation respects a single passport name", () => {
  deepEqual(normalizeAnswers({ givenNames: "欣", purpose: 17 }), { ...emptyAnswers(), givenNames: "欣" });
  const answers = { ...emptyAnswers(), givenNames: "欣", birthDate: "2008-11-26", citizenship: "中国", residence: "中国",
    email: "traveler@example.invalid", passportExpiry: "2030-12-01" };
  const today = new Date("2026-11-26T12:00:00Z");
  deepEqual(validateStep("identity", answers, today), {});
  ok(validateStep("identity", { ...answers, birthDate: "2008-11-27" }, today).birthDate);
  ok(validateStep("identity", { ...answers, birthDate: "2005-02-30" }, today).birthDate);
  ok(validateStep("identity", { ...answers, birthDate: "2006-03-01" }, new Date("2024-02-29T01:00:00Z")).birthDate);
  deepEqual(validateStep("identity", answers, new Date("2026-11-25T16:01:00Z")), {});
});

test("passport expiry must be a real date after birth and still valid on the Beijing calendar day", () => {
  const answers = { ...emptyAnswers(), givenNames: "欣", birthDate: "1995-06-12", citizenship: "中国",
    residence: "中国", email: "traveler@example.invalid", passportExpiry: "2026-11-26" };
  const beforeMidnight = new Date("2026-11-26T15:59:59Z");
  const afterMidnight = new Date("2026-11-26T16:00:00Z");
  equal(ANSWER_LABELS.passportExpiry, "护照到期日期");
  equal(validateStep("identity", { ...answers, passportExpiry: "" }, beforeMidnight).passportExpiry, "请填写护照的到期日期。");
  match(validateStep("identity", { ...answers, passportExpiry: "1990-01-01" }, beforeMidnight).passportExpiry ?? "", /早于出生日期/);
  match(validateStep("identity", { ...answers, passportExpiry: "2030-02-30" }, beforeMidnight).passportExpiry ?? "", /有效的护照到期日期/);
  deepEqual(validateStep("identity", answers, beforeMidnight), {});
  match(validateStep("identity", answers, afterMidnight).passportExpiry ?? "", /护照已过期/);
});

test("only guests receive host questions and planned dates must be in order", () => {
  const trip = { ...emptyAnswers(), purpose: "holiday", arrivalDate: "2027-06-01", departureDate: "2027-06-10",
    accommodation: "旅馆", travelHistory: "无", destinations: "悉尼" };
  deepEqual(validateStep("visit", trip), {});
  ok(validateStep("visit", {...trip, purpose: "visit"}).hostName);
  ok(validateStep("visit", {...trip, departureDate: "2027-05-31"}).departureDate);
});

test("template changes depend on the facts each letter uses and preserve Chinese names", () => {
  const answers = { ...emptyAnswers(), givenNames: "晓", familyName: "李", hostName: "林明", destinations: "堪培拉", hostAddress: "澳大利亚悉尼" };
  match(templateText("itinerary", answers), /晓 李/);
  match(templateText("invitation", answers), /林明/);
  match(templateText("employment", answers), /Employer to confirm/);
  const edited = { ...answers, hostName: "陈明" };
  notEqual(templateFingerprint("invitation", answers), templateFingerprint("invitation", edited));
  equal(templateFingerprint("employment", answers), templateFingerprint("employment", edited));
  equal(templateFingerprint("itinerary", answers), templateFingerprint("itinerary", edited));
});

test("a reviewed guide does not invalidate a saved letter with unchanged details", () => {
  const answers = { ...emptyAnswers(), givenNames: "An", familyName: "Li" };
  equal(templateFingerprint("employment", answers), "2026-11-26-fe3ffa93");
});

test("payer and purpose changes update the itinerary and invitation, including older drafts", () => {
  const answers = { ...emptyAnswers(), purpose: "visit", payer: "self", hostAddress: "Old address" };
  const changedPayer = { ...answers, payer: "host" };
  const changedPurpose = { ...answers, purpose: "holiday" };
  // These stored fingerprints predate the payer and purpose fields in the generated text.
  const legacy = { itinerary: "2026-11-26-69f039f3", invitation: "2026-11-26-1cddde00" };
  for (const kind of ["itinerary", "invitation"] as const) {
    const current = templateFingerprint(kind, answers);
    notEqual(current, legacy[kind]);
    notEqual(current, templateFingerprint(kind, changedPayer));
    notEqual(current, templateFingerprint(kind, changedPurpose));
    match(templateText(kind, changedPayer), /Who will cover the trip costs: The host in Australia/);
    match(templateText(kind, changedPurpose), /Purpose of travel: Holiday/);
  }
  ok(!templateText("invitation", changedPurpose).includes("Old address"));
  equal(templateFingerprint("employment", answers), templateFingerprint("employment", changedPayer));
  equal(templateFingerprint("employment", answers), templateFingerprint("employment", changedPurpose));
});

test("every generated letter fits the editor and save limit with maximal partial answers", () => {
  const longAnswer = "旅".repeat(4000);
  const answers = normalizeAnswers(Object.fromEntries(Object.keys(emptyAnswers()).map(key => [key, longAnswer])));
  answers.purpose = "visit";
  answers.payer = "shared";
  for (const kind of Object.keys(TEMPLATE_LABELS) as TemplateKind[]) {
    const body = templateText(kind, answers);
    ok(body.length <= MAX_TEMPLATE_LENGTH, kind);
    ok(body.includes(longAnswer), kind);
  }
  ok(templateText("invitation", answers).length > 36_000);
});
