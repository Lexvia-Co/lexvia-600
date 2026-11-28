import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { reviewedPassages, searchPassages } from "../lib/workspace/assistant-library";
import { STEPS, type Step } from "../lib/workspace/model";

const evaluation = readFileSync(new URL("./fixtures/assistant-pilot-evaluation.md", import.meta.url), "utf8");
const questions = [...evaluation.matchAll(/^\| \d+ \| (\w+) \| ([^|]+) \| ([\w.-]+) \|$/gm)];

test("40 synthetic Mandarin questions retrieve the reviewed answer or referral", () => {
  assert.equal(questions.length, 40);
  for (const [, step, question, id] of questions) {
    assert.ok(STEPS.includes(step as Step));
    assert.equal(searchPassages(question, step as Step)[0]?.id, id, question);
  }
});

test("every answer has a unique citation, reviewed source and workspace destination", () => {
  assert.equal(new Set(reviewedPassages.map(passage => passage.id)).size, reviewedPassages.length);
  for (const passage of reviewedPassages) {
    assert.equal(new URL(passage.source).hostname, "immi.homeaffairs.gov.au");
    assert.match(passage.reviewed, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(passage.sourceSection && passage.anchor && passage.action);
  }
  for (const step of STEPS) {
    const topics = searchPassages("", step);
    assert.ok(topics.length > 0);
    assert.ok(topics.every(passage => passage.step === step));
  }
  assert.equal(searchPassages("袋鼠的学名是什么", "visit").length, 0);
});
