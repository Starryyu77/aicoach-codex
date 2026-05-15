import assert from "node:assert/strict";
import test from "node:test";
import { historyCardKey } from "../road-to-summer/frontend/src/lib/historyKeys.ts";

test("historyCardKey keeps malformed history cards unique", () => {
  const cards = [{}, {}];
  const keys = cards.map((card, index) => historyCardKey(card, index));

  assert.deepEqual(keys, ["fallback:0:unknown", "fallback:1:unknown"]);
  assert.equal(new Set(keys).size, keys.length);
});

test("historyCardKey prefers persisted card id", () => {
  assert.equal(historyCardKey({ id: "card-2026-05-15" }, 3), "id:card-2026-05-15");
});

test("historyCardKey stays unique when non-id fields collide", () => {
  const cards = [
    { date: "2026-05-15", theme: "上肢训练" },
    { date: "2026-05-15", theme: "上肢训练" }
  ];
  const keys = cards.map((card, index) => historyCardKey(card, index));

  assert.deepEqual(keys, [
    "fallback:0:2026-05-15|上肢训练",
    "fallback:1:2026-05-15|上肢训练"
  ]);
  assert.equal(new Set(keys).size, keys.length);
});
