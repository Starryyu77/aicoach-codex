import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { setSecret } from "../road-to-summer/gateway/src/config/secrets.ts";
import { MockAsrProvider } from "../road-to-summer/gateway/src/providers/asr/MockAsrProvider.ts";
import { OpenAIWhisperProvider } from "../road-to-summer/gateway/src/providers/asr/OpenAIWhisperProvider.ts";
import { DoubaoAsrProvider } from "../road-to-summer/gateway/src/providers/asr/DoubaoAsrProvider.ts";

test("mock ASR treats audio text as transcript", async () => {
  const provider = new MockAsrProvider({ id: "mock-asr", type: "mock", label: "Mock ASR" });
  const output = await provider.transcribe({ audio: "高位下拉有人了" });
  assert.equal(output.text, "高位下拉有人了");
  assert.equal(output.provider, "mock-asr");
});

test("OpenAI Whisper provider posts audio transcription request", async () => {
  const runtimeRoot = await mkdtemp(path.join(tmpdir(), "rts-asr-provider-"));
  await setSecret("OPENAI_TEST_KEY", "sk-test", runtimeRoot);
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ text: "高位下拉有人了" }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const provider = new OpenAIWhisperProvider({
      id: "openai-whisper-test",
      type: "openai-whisper",
      label: "OpenAI Whisper Test",
      baseUrl: "https://api.openai.com/v1",
      model: "whisper-1",
      apiKeyRef: "OPENAI_TEST_KEY",
      timeoutMs: 30000
    }, { runtimeRoot });
    const result = await provider.transcribe({
      audio: Buffer.from("mock audio").toString("base64"),
      fileName: "audio.webm",
      mimeType: "audio/webm"
    });
    assert.equal(result.text, "高位下拉有人了");
    assert.equal(calls[0].url, "https://api.openai.com/v1/audio/transcriptions");
    assert.equal(calls[0].init.headers.authorization, "Bearer sk-test");
    assert.ok(calls[0].init.body instanceof FormData);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Doubao ASR provider supports flash recognition with single API key", async () => {
  const runtimeRoot = await mkdtemp(path.join(tmpdir(), "rts-doubao-provider-"));
  await setSecret("DOUBAO_TEST_KEY", "doubao-test-key", runtimeRoot);
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ result: { text: "高位下拉有人了" } }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-api-status-code": "20000000",
        "x-api-message": "OK",
        "x-tt-logid": "logid-test"
      }
    });
  };
  try {
    const provider = new DoubaoAsrProvider({
      id: "doubao-asr-test",
      type: "doubao-asr",
      label: "Doubao ASR Test",
      baseUrl: "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash",
      model: "bigmodel",
      apiKeyRef: "DOUBAO_TEST_KEY",
      timeoutMs: 60000,
      extra: { resourceId: "volc.bigasr.auc_turbo" }
    }, { runtimeRoot });
    const result = await provider.transcribe({
      audio: Buffer.from("mock audio").toString("base64"),
      fileName: "audio.ogg",
      mimeType: "audio/ogg"
    });
    assert.equal(result.text, "高位下拉有人了");
    assert.equal(calls[0].url, "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash");
    assert.equal(calls[0].init.headers["X-Api-Key"], "doubao-test-key");
    assert.equal(calls[0].init.headers["X-Api-Resource-Id"], "volc.bigasr.auc_turbo");
    assert.equal(JSON.parse(calls[0].init.body).request.model_name, "bigmodel");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
