import assert from "node:assert/strict";
import test from "node:test";
import { replaceRelativeDateLabels } from "../road-to-summer/gateway/src/time/absoluteDateText.ts";

test("relative date labels are rewritten from a concrete base date", () => {
  const result = replaceRelativeDateLabels(
    "昨天训练后酸，今天做恢复，明天（5月16日）再检查，后天可训练，5月17日可加量。",
    "2026-05-15"
  );
  assert.equal(
    result,
    "2026-05-14 训练后酸，2026-05-15 做恢复，2026-05-16 再检查，2026-05-17 可训练，2026-05-17 可加量。"
  );
});
