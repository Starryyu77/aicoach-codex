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
