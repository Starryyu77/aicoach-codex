import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { TestHermesClient } from "./support/TestHermesClient.ts";
import { handleChat } from "../road-to-summer/gateway/src/routes/chat.ts";
import { handleHistoryList } from "../road-to-summer/gateway/src/routes/history.ts";
import { handleEndSession, handleGetCurrentSession, handleResetSession } from "../road-to-summer/gateway/src/routes/session.ts";

async function context() {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "rts-phone-flow-"));
  const hermes = new TestHermesClient();
  return {
    stateRoot,
    providerRegistry: {
      getHermesProvider: async () => ({
        instance: {
          id: "phone-flow-hermes",
          type: "hermes-api-server",
          label: "Phone Flow Hermes"
        },
        sendMessage: (input) => hermes.sendMessage(input)
      })
    }
  };
}

test("phone state flow preserves chat and plan, then hides ended dock and saves history", async () => {
  const ctx = await context();
  const reset = await handleResetSession(ctx, {
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });
  assert.equal(reset.current_plan, null);
  assert.deepEqual(reset.chat_messages, []);

  const generated = await handleChat(ctx, {
    text: "今天该练什么？",
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });
  assert.equal(generated.hermes_output.type, "training_plan");
  assert.ok(generated.ui.current_plan.title);
  assert.equal(generated.ui.current_session.chat_messages.length, 2);

  const adjusted = await handleChat(ctx, {
    text: "太轻了",
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });
  assert.equal(adjusted.hermes_output.type, "plan_patch");
  assert.equal(adjusted.ui.current_session.chat_messages.length, 4);
  assert.ok(adjusted.ui.current_plan);

  const hydrated = await handleGetCurrentSession(ctx);
  assert.ok(hydrated.current_plan);
  assert.equal(hydrated.chat_messages.length, 4);
  assert.equal(hydrated.target_date, "2026-05-15");

  const historyBeforeEnd = await handleHistoryList(ctx);
  assert.equal(historyBeforeEnd.length, 0);

  const ended = await handleEndSession(ctx, {
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });
  assert.equal(ended.hermes_output.type, "training_card");
  assert.ok(ended.ui.training_card.id);

  const afterEnd = await handleGetCurrentSession(ctx);
  assert.equal(afterEnd.phase, "ended");
  assert.equal(afterEnd.current_plan, null);
  assert.equal(afterEnd.current_exercise, undefined);
  assert.equal(afterEnd.plan_card, undefined);

  const historyAfterEnd = await handleHistoryList(ctx);
  assert.equal(historyAfterEnd.length, 1);
  assert.equal(historyAfterEnd[0].id, ended.ui.training_card.id);
  assert.doesNotMatch(historyAfterEnd[0].markdown, /今天|明天|昨天|前天/);
});

