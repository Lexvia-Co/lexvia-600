import { equal } from "node:assert/strict";
import { test } from "node:test";
import { emptyAnswers } from "../lib/workspace/model";
import { answerProgress } from "../lib/workspace/step-progress";

test("step progress follows applicable saved answers and their validity", () => {
  const answers = emptyAnswers();
  equal(answerProgress("visit", { ...answers, hostName: "Former host" }), "未填写");
  equal(answerProgress("identity", { ...answers, email: "invalid" }), "填写中");
  const trip = { ...answers, purpose: "holiday", arrivalDate: "2027-04-10", departureDate: "2027-04-12",
    destinations: "悉尼", accommodation: "旅馆", travelHistory: "无" };
  equal(answerProgress("visit", trip), "已填好");
  equal(answerProgress("visit", { ...trip, purpose: "visit" }), "填写中");
  equal(answerProgress("visit", { ...trip, departureDate: "2027-04-08" }), "填写中");
});
