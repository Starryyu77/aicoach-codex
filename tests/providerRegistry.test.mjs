import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ProviderConfigStore } from "../road-to-summer/gateway/src/providers/ProviderConfigStore.ts";
import { ProviderRegistry } from "../road-to-summer/gateway/src/providers/ProviderRegistry.ts";

async function registry() {
  const runtimeRoot = await mkdtemp(path.join(tmpdir(), "rts-provider-registry-"));
  const store = new ProviderConfigStore(runtimeRoot);
  return new ProviderRegistry(store);
}

test("provider registry uses real Hermes and mock peripheral providers by default", async () => {
  const providers = await registry();
  const hermes = await providers.getHermesProvider();
  const asr = await providers.getAsrProvider();
  const vision = await providers.getVisionProvider();
  assert.equal(hermes.instance.id, "local-hermes");
  assert.equal(hermes.instance.type, "hermes-api-server");
  assert.equal(asr.instance.id, "mock-asr");
  assert.equal(vision.instance.id, "mock-vision");
});

test("provider registry can switch active Hermes provider from config", async () => {
  const providers = await registry();
  await providers.store.setActive("hermes", "local-hermes");
  const hermes = await providers.getHermesProvider();
  assert.equal(hermes.instance.id, "local-hermes");
  assert.equal(hermes.instance.type, "hermes-api-server");
});
