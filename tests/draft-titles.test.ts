import assert from "node:assert/strict";
import { test } from "node:test";
import { draftTitles } from "../components/workspace/draft-titles";

test("dashboard draft titles use available dates and distinguish matching trips regardless of list order", () => {
  const blank = { createdAt: new Date("2026-11-27T16:00:00Z"), arrivalDate: "", departureDate: "", purpose: "" };
  const drafts = [
    { ...blank, id: "b" }, { ...blank, id: "a" },
    { ...blank, id: "c", purpose: "visit", arrivalDate: "2027-02-10" },
    { ...blank, id: "d", purpose: "holiday", departureDate: "2027-03-01" },
    { ...blank, id: "e", purpose: "holiday", arrivalDate: "2027-02-30" },
  ];
  const titles = draftTitles(drafts);
  assert.equal(titles.get("a"), "赴澳行程 · 2026年11月28日 00:00 创建（1）");
  assert.equal(titles.get("b"), "赴澳行程 · 2026年11月28日 00:00 创建（2）");
  assert.equal(titles.get("c"), "探亲访友 · 2027年2月赴澳");
  assert.equal(titles.get("d"), "旅游度假 · 2027年3月离澳");
  assert.equal(titles.get("e"), "旅游度假 · 2026年11月28日 00:00 创建");
  assert.deepEqual(draftTitles([...drafts].reverse()), titles);
});
