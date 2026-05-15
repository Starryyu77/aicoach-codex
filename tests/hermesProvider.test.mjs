import assert from "node:assert/strict";
import test from "node:test";
import { AnthropicCompatibleHermesProvider } from "../road-to-summer/gateway/src/providers/hermes/AnthropicCompatibleHermesProvider.ts";
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

test("parseHermesResponse normalizes MiniMax training_plan item shape", () => {
  const output = parseHermesResponse({
    provider: "hermes",
    raw: {},
    output: JSON.stringify({
      plan_type: "current_session_update",
      training_plan: {
        theme: "胸肩综合",
        duration_minutes: 40,
        goal: "完成胸肩训练",
        reasoning: "根据今天目标生成。",
        items: [
        {
          name: "哑铃卧推",
          exercise: "哑铃卧推",
          role: "main",
            sets: 3,
            reps: "8-10 次",
            intensity: "RPE 7",
            rest: 90,
            cue: "肩胛稳定。"
          }
        ]
      },
      quick_actions: ["开始训练"]
    })
  });
  assert.equal(output.type, "training_plan");
  assert.equal(output.plan_card.title, "胸肩综合");
  assert.equal(output.plan_card.duration, "40 分钟");
  assert.equal(output.plan_card.sections[0].items[0].exercise, "哑铃卧推");
  assert.equal(output.plan_card.sections[0].items[0].sets, "3");
});

test("parseHermesResponse coerces object quick actions and infers missing exercises", () => {
  const output = parseHermesResponse({
    provider: "hermes",
    raw: {},
    output: JSON.stringify({
      type: "training_plan",
      chat_message: "ok",
      plan_card: {
        title: "胸肩",
        duration: "40分钟",
        goal: "训练",
        reasoning: "reason",
        risk_notes: [],
        sections: [
          {
            name: "主训一：平板哑铃卧推（12分钟）",
            items: [
              {
                role: "main",
                sets: 3,
                reps: "8-10",
                intensity: "RPE 7",
                rest: 90,
                cue: "沉肩"
              }
            ]
          }
        ]
      },
      quick_actions: [
        { label: "开始平板卧推", action: "start_main" },
        "结束训练"
      ]
    })
  });
  assert.equal(output.plan_card.sections[0].items[0].exercise, "平板哑铃卧推");
  assert.deepEqual(output.quick_actions, ["开始平板卧推", "结束训练"]);
});

test("parseHermesResponse coerces typed plan_patch object quick actions", () => {
  const output = parseHermesResponse({
    provider: "hermes",
    raw: {},
    output: JSON.stringify({
      type: "plan_patch",
      chat_message: "继续当前动作。",
      patch: {
        operation: "continue_current",
        target_exercise: "胸托哑铃划船",
        to: { exercise: "胸托哑铃划船", cue: "挺胸固定" },
        reason: "热身已结束",
        next_instruction: "做第 1 组。"
      },
      quick_actions: [
        { label: "完成本组", action: "complete_set" },
        { next_instruction: "减轻重量" }
      ]
    })
  });
  assert.equal(output.type, "plan_patch");
  assert.equal(output.patch.operation, "continue_current");
  assert.equal(output.patch.to, "胸托哑铃划船");
  assert.deepEqual(output.quick_actions, ["完成本组", "减轻重量"]);
});

test("parseHermesResponse normalizes typed plan_patch updated plan aliases", () => {
  const output = parseHermesResponse({
    provider: "hermes",
    raw: {},
    output: JSON.stringify({
      type: "plan_patch",
      chat_message: "已经把当前动作替换掉。",
      patch: {
        operation: "swap_exercise",
        target: "当前动作",
        replacement: { exercise: "台阶上步" },
        reason: "用户要求替换动作。",
        instruction: "下一组做台阶上步。"
      },
      updated_plan: {
        title: "下肢训练",
        duration_minutes: 40,
        goal: "训练下肢",
        reasoning: "已替换动作。",
        items: [{ name: "台阶上步", sets: 3, reps: "10 次", intensity: "RPE 6", rest: 60, cue: "脚跟发力。" }]
      },
      quick_actions: []
    })
  });
  assert.equal(output.type, "plan_patch");
  assert.equal(output.patch.operation, "replace_exercise");
  assert.equal(output.patch.target_exercise, "当前动作");
  assert.equal(output.patch.to, "台阶上步");
  assert.equal(output.session_update.plan_card.title, "下肢训练");
  assert.equal(output.session_update.plan_card.sections[0].items[0].exercise, "台阶上步");
});

test("parseHermesResponse rejects partial training_plan before ui mapping", () => {
  assert.throws(
    () => parseHermesResponse({
      provider: "hermes",
      raw: {},
      output: JSON.stringify({
        type: "training_plan",
        chat_message: "partial",
        plan_card: {
          title: "不完整计划对象",
          duration: "40 分钟",
          goal: "容错测试"
        },
        quick_actions: []
      })
    }),
    /training_plan\.plan_card\.sections missing/
  );
});

test("Anthropic-compatible Hermes provider sends Messages API request", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({
      type: "message",
      content: [
        { type: "thinking", thinking: "hidden" },
        {
          type: "text",
          text: JSON.stringify({
            type: "plan_patch",
            chat_message: "direct ok",
            patch: {
              operation: "update_cue",
              target_exercise: "连接测试",
              reason: "provider test",
              next_instruction: "继续"
            },
            quick_actions: []
          })
        }
      ]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const provider = new AnthropicCompatibleHermesProvider({
      id: "minimax-cn-test",
      type: "anthropic-compatible-hermes",
      label: "MiniMax CN Test",
      baseUrl: "https://api.minimaxi.com/anthropic",
      model: "MiniMax-M2.7-highspeed",
      apiKeyRef: "MINIMAX_CN_API_KEY",
      timeoutMs: 90000,
      extra: { maxTokens: 1024 }
    });
    const response = await provider.sendMessage({
      source: "text",
      raw_text: "连接测试",
      time_context: buildTimeContext({ rawText: "连接测试" }),
      current_session: {},
      instruction: "Return strict JSON."
    });
    const output = parseHermesResponse(response);
    const body = JSON.parse(calls[0].init.body);
    assert.equal(calls[0].url, "https://api.minimaxi.com/anthropic/v1/messages");
    assert.equal(body.model, "MiniMax-M2.7-highspeed");
    assert.match(calls[0].init.headers.authorization, /^Bearer /);
    assert.equal(output.type, "plan_patch");
  } finally {
    globalThis.fetch = originalFetch;
  }
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
