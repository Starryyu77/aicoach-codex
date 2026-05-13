import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ProviderConfigStore } from "../road-to-summer/gateway/src/providers/ProviderConfigStore.ts";
import { ProviderRegistry } from "../road-to-summer/gateway/src/providers/ProviderRegistry.ts";
import {
  handleProviderCreateInstance,
  handleProviderPresetsGet,
  handleProvidersGet,
  handleProviderSetActive,
  handleProviderTest
} from "../road-to-summer/gateway/src/routes/providers.ts";

async function context() {
  const runtimeRoot = await mkdtemp(path.join(tmpdir(), "rts-provider-routes-"));
  return {
    providerRegistry: new ProviderRegistry(new ProviderConfigStore(runtimeRoot)),
    stateRoot: runtimeRoot
  };
}

test("provider route handlers expose config, create instance, test, and set active", async () => {
  const ctx = await context();
  const initial = await handleProvidersGet(ctx);
  assert.equal(initial.providers.hermes.active, "mock-hermes");
  const presets = await handleProviderPresetsGet();
  assert.ok(presets.presets.asr.some((preset) => preset.id === "doubao-asr-flash"));

  const updated = await handleProviderCreateInstance(ctx, "asr", {
    id: "openai-whisper-route",
    type: "openai-whisper",
    label: "OpenAI Whisper Route",
    baseUrl: "https://api.openai.com/v1",
    model: "whisper-1",
    apiKeyRef: "OPENAI_ROUTE_KEY",
    apiKey: "sk-route"
  });
  const created = updated.providers.asr.instances.find((item) => item.id === "openai-whisper-route");
  assert.equal(created.hasApiKey, true);
  assert.equal("apiKey" in created, false);

  const testResult = await handleProviderTest(ctx, "asr", { id: "openai-whisper-route" });
  assert.equal(testResult.ok, true);

  const active = await handleProviderSetActive(ctx, "asr", { id: "openai-whisper-route" });
  assert.equal(active.providers.asr.active, "openai-whisper-route");
});
