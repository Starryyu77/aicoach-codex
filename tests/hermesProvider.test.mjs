import assert from "node:assert/strict";
import test from "node:test";
import { HermesApiServerProvider } from "../road-to-summer/gateway/src/providers/hermes/HermesApiServerProvider.ts";
import { parseHermesResponse } from "../road-to-summer/gateway/src/hermes/parseHermesResponse.ts";
import { buildTimeContext } from "../road-to-summer/gateway/src/time/timeContext.ts";

test("Hermes API Server provider sends OpenAI-compatible chat completion request", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            type: "plan_patch",
            chat_message: "provider ok",
            patch: {
              operation: "update_cue",
              target_exercise: "高位下拉",
              reason: "provider test",
              next_instruction: "继续"
            },
            quick_actions: []
          })
        }
      }]
    }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-hermes-session-id": "session-1"
      }
    });
  };
  try {
    const provider = new HermesApiServerProvider({
      id: "local-hermes-test",
      type: "hermes-api-server",
      label: "Local Hermes Test",
      baseUrl: "http://127.0.0.1:8642/v1",
      model: "hermes-agent",
      timeoutMs: 30000,
      endpointMode: "chat_completions"
    });
    const response = await provider.sendMessage({
      source: "text",
      raw_text: "高位下拉有人了",
      time_context: buildTimeContext({ rawText: "高位下拉有人了" }),
      current_session: { id: "session-1" },
      instruction: "Return strict JSON."
    });
    const output = parseHermesResponse(response);
    const body = JSON.parse(calls[0].init.body);
    assert.equal(calls[0].url, "http://127.0.0.1:8642/v1/chat/completions");
    assert.equal(body.model, "hermes-agent");
    assert.match(body.messages[1].content, /road_to_summer/);
    assert.equal(output.type, "plan_patch");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("parseHermesResponse wraps Hermes shorthand patch without local coach fallback", () => {
  const output = parseHermesResponse({
    provider: "hermes",
    raw: {},
    output: JSON.stringify({
      operation: "adjust_load",
      target_exercise: "全身活动度循环",
      from: "RPE 3-4",
      to: "增加 1-2 次",
      reason: "用户反馈太轻。",
      next_instruction: "下一组保持动作质量，增加 1-2 次。"
    })
  });
  assert.equal(output.type, "plan_patch");
  assert.equal(output.chat_message, "下一组保持动作质量，增加 1-2 次。");
  assert.equal(output.patch.operation, "adjust_load");
  assert.equal(output.patch.target_exercise, "全身活动度循环");
});

test("parseHermesResponse wraps nested Hermes plan_patch object", () => {
  const output = parseHermesResponse({
    provider: "hermes",
    raw: {},
    output: JSON.stringify({
      plan_patch: {
        operation: "adjust_load",
        target_exercise: "全身活动度循环",
        from: "RPE 3-4",
        to: "RPE 4-5",
        reason: "真实 Hermes 返回了嵌套 plan_patch。",
        next_instruction: "下一组增加每项动作 2 次。",
        session_update: {
          current_exercise: "全身活动度循环",
          current_set: 2
        }
      },
      training_card: {
        phase: "in_session"
      }
    })
  });
  assert.equal(output.type, "plan_patch");
  assert.equal(output.patch.to, "RPE 4-5");
  assert.equal(output.session_update.current_exercise, "全身活动度循环");
});

test("parseHermesResponse repairs real Hermes top-level plan_patch shorthand", () => {
  const output = parseHermesResponse({
    provider: "hermes",
    raw: {},
    output: JSON.stringify({
      type: "plan_patch",
      session_id: "debug-session",
      timestamp: "2026-05-15T01:00:00.000Z",
      patch_operation: "adjust_load",
      direction: "increase",
      adjustment_magnitude: "5-10%",
      reasoning: "用户反馈太轻，但动作质量稳定。",
      next_action: "下一组先增加 5%，如果动作变形就退回原重量。",
      warning_if_any: null
    })
  });
  assert.equal(output.type, "plan_patch");
  assert.equal(output.chat_message, "下一组先增加 5%，如果动作变形就退回原重量。");
  assert.equal(output.patch.operation, "adjust_load");
  assert.equal(output.patch.target_exercise, "当前动作");
  assert.equal(output.patch.to, "增加 5-10%");
  assert.equal(output.patch.reason, "用户反馈太轻，但动作质量稳定。");
  assert.equal(output.patch.next_instruction, "下一组先增加 5%，如果动作变形就退回原重量。");
});

test("parseHermesResponse unwraps common Hermes wrapper keys", () => {
  const output = parseHermesResponse({
    provider: "hermes",
    raw: {},
    output: JSON.stringify({
      result: {
        patch: {
          operation: "update_cue",
          target_exercise: "高位下拉",
          reason: "真实 Hermes 返回了 wrapper.patch。",
          next_instruction: "先沉肩，再用手肘向裤兜方向拉。"
        }
      }
    })
  });
  assert.equal(output.type, "plan_patch");
  assert.equal(output.patch.operation, "update_cue");
  assert.equal(output.chat_message, "先沉肩，再用手肘向裤兜方向拉。");
});

test("Hermes API Server provider test uses capabilities endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({
      object: "hermes.api_server.capabilities",
      platform: "hermes-agent",
      features: { chat_completions: true }
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const provider = new HermesApiServerProvider({
      id: "local-hermes-test",
      type: "hermes-api-server",
      label: "Local Hermes Test",
      baseUrl: "http://127.0.0.1:8642/v1"
    });
    const result = await provider.test();
    assert.equal(result.ok, true);
    assert.equal(calls[0].url, "http://127.0.0.1:8642/v1/capabilities");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
