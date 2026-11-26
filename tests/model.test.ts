import { deepEqual, equal, match, notEqual, ok } from "node:assert/strict";
import test from "node:test";
import {
  emptyAnswers, evidenceFor, normalizeAnswers, templateFingerprint, templateText, validateStep,
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
