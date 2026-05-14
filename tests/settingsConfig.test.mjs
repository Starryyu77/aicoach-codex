import assert from "node:assert/strict";
import { readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ProviderConfigStore } from "../road-to-summer/gateway/src/providers/ProviderConfigStore.ts";
import { ProviderRegistry } from "../road-to-summer/gateway/src/providers/ProviderRegistry.ts";
import { sanitizeSecretRef } from "../road-to-summer/gateway/src/config/secrets.ts";
import { isAllowedOrigin } from "../road-to-summer/gateway/src/server.ts";
import {
  handleHermesRuntimeGet,
  handleHermesRuntimePresetsGet,
  handleHermesRuntimeUpdate
} from "../road-to-summer/gateway/src/routes/hermesRuntime.ts";

test("provider config keeps secrets out of public config", async () => {
  const runtimeRoot = await mkdtemp(path.join(tmpdir(), "rts-settings-config-"));
  const store = new ProviderConfigStore(runtimeRoot);
  await store.upsertInstance("asr", {
    id: "openai-whisper-test",
    type: "openai-whisper",
    label: "OpenAI Whisper Test",
    baseUrl: "https://api.openai.com/v1",
    model: "whisper-1",
    apiKeyRef: "OPENAI_TEST_KEY",
    timeoutMs: 30000
  }, "sk-test-secret");

  const publicConfig = await store.getPublicConfig();
  const instance = publicConfig.providers.asr.instances.find((item) => item.id === "openai-whisper-test");
  assert.equal(instance?.hasApiKey, true);
  assert.equal("apiKey" in (instance || {}), false);

  const secrets = await readFile(path.join(runtimeRoot, "secrets.env"), "utf8");
  assert.match(secrets, /OPENAI_TEST_KEY="sk-test-secret"/);
});

test("Hermes runtime config stores MiniMax key as local secret only", async () => {
  const runtimeRoot = await mkdtemp(path.join(tmpdir(), "rts-hermes-runtime-"));
  const ctx = {
    providerRegistry: new ProviderRegistry(new ProviderConfigStore(runtimeRoot)),
    stateRoot: runtimeRoot
  };

  const presets = await handleHermesRuntimePresetsGet();
  assert.ok(presets.presets.some((preset) => preset.id === "minimax-global"));

  const publicConfig = await handleHermesRuntimeUpdate(ctx, {
    activePresetId: "minimax-global",
    apiKey: "sk-minimax-test"
  });
  assert.equal(publicConfig.activePresetId, "minimax-global");
  assert.equal(publicConfig.provider, "minimax");
  assert.equal(publicConfig.hasApiKey, true);
  assert.equal("apiKey" in publicConfig, false);

  const reloaded = await handleHermesRuntimeGet(ctx);
  assert.equal(reloaded.hasApiKey, true);
  const secrets = await readFile(path.join(runtimeRoot, "secrets.env"), "utf8");
  assert.match(secrets, /MINIMAX_API_KEY="sk-minimax-test"/);
  assert.match(secrets, /HERMES_INFERENCE_PROVIDER="minimax"/);
});

test("security config rejects malformed secret refs and non-local CORS origins", () => {
  assert.equal(sanitizeSecretRef("OPENAI_API_KEY"), "OPENAI_API_KEY");
  assert.throws(() => sanitizeSecretRef("BAD=KEY"), /Invalid secret ref/);
  assert.throws(() => sanitizeSecretRef("BAD\nKEY"), /Invalid secret ref/);
  assert.equal(isAllowedOrigin("http://localhost:3000"), true);
  assert.equal(isAllowedOrigin("http://127.0.0.1:3000"), true);
  assert.equal(isAllowedOrigin("https://attacker.example"), false);
});
