import assert from "node:assert/strict";
import test from "node:test";
import { validEnglishWording } from "../lib/workspace/handoff";

test("English wording can be saved as a draft but only reviewed English can be confirmed", () => {
  for (const text of ["", "  ", "教师", "I work in 上海"]) {
    assert.equal(validEnglishWording({ occupation: { text, confirmed: false } }), true);
    assert.equal(validEnglishWording({ occupation: { text, confirmed: true } }), false);
  }
  assert.equal(validEnglishWording({ occupation: { text: "Teacher", confirmed: true } }), true);
  for (const payload of [null, [], { familyName: { text: "Wrong field", confirmed: true } },
    { occupation: { text: "Teacher", confirmed: "true" } }, { occupation: { text: "x".repeat(4001), confirmed: false } }]) {
    assert.equal(validEnglishWording(payload), false);
  }
});
