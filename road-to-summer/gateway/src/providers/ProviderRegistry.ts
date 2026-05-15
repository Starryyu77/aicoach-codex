import type { AsrProvider, HermesProvider, ProviderCategory, ProviderInstance, VisionProvider } from "./types.ts";
import { ProviderConfigStore } from "./ProviderConfigStore.ts";
import { HermesApiServerProvider } from "./hermes/HermesApiServerProvider.ts";
import { AnthropicCompatibleHermesProvider } from "./hermes/AnthropicCompatibleHermesProvider.ts";
import { OpenAICompatibleHermesProvider } from "./hermes/OpenAICompatibleHermesProvider.ts";
import { MockAsrProvider } from "./asr/MockAsrProvider.ts";
import { OpenAIWhisperProvider } from "./asr/OpenAIWhisperProvider.ts";
import { DoubaoAsrProvider } from "./asr/DoubaoAsrProvider.ts";
import { GroqWhisperProvider } from "./asr/GroqWhisperProvider.ts";
import { LocalWhisperProvider } from "./asr/LocalWhisperProvider.ts";
import { MockVisionProvider } from "./vision/MockVisionProvider.ts";
import { ExternalPoseHttpProvider } from "./vision/ExternalPoseHttpProvider.ts";

export class ProviderRegistry {
  readonly store: ProviderConfigStore;

  constructor(store = new ProviderConfigStore()) {
    this.store = store;
  }

  async getHermesProvider(): Promise<HermesProvider> {
    return this.createHermesProvider(await this.store.getActiveInstance("hermes"));
  }

  async getAsrProvider(): Promise<AsrProvider> {
    return this.createAsrProvider(await this.store.getActiveInstance("asr"));
  }

  async getVisionProvider(): Promise<VisionProvider> {
    return this.createVisionProvider(await this.store.getActiveInstance("vision"));
  }

  createHermesProvider(instance: ProviderInstance): HermesProvider {
    if (instance.type === "mock") throw new Error("Mock Hermes is disabled for /chat. Configure local-hermes or another real Hermes endpoint.");
    if (instance.type === "hermes-api-server") return new HermesApiServerProvider(instance, { runtimeRoot: this.store.runtimeRoot });
    if (instance.type === "openai-compatible-hermes") return new OpenAICompatibleHermesProvider(instance, { runtimeRoot: this.store.runtimeRoot });
    if (instance.type === "anthropic-compatible-hermes") return new AnthropicCompatibleHermesProvider(instance, { runtimeRoot: this.store.runtimeRoot });
    throw new Error(`Unsupported Hermes provider type: ${instance.type}`);
  }

  createAsrProvider(instance: ProviderInstance): AsrProvider {
    if (instance.type === "mock") return new MockAsrProvider(instance);
    if (instance.type === "openai-whisper") return new OpenAIWhisperProvider(instance, { runtimeRoot: this.store.runtimeRoot });
    if (instance.type === "doubao-asr") return new DoubaoAsrProvider(instance, { runtimeRoot: this.store.runtimeRoot });
    if (instance.type === "groq-whisper") return new GroqWhisperProvider(instance, { runtimeRoot: this.store.runtimeRoot });
    if (instance.type === "local-whisper") return new LocalWhisperProvider(instance);
    throw new Error(`Unsupported ASR provider type: ${instance.type}`);
  }

  createVisionProvider(instance: ProviderInstance): VisionProvider {
    if (instance.type === "mock") return new MockVisionProvider(instance);
    if (instance.type === "external-pose-http") return new ExternalPoseHttpProvider(instance, { runtimeRoot: this.store.runtimeRoot });
    throw new Error(`Unsupported Vision provider type: ${instance.type}`);
  }

  async getProvider(category: ProviderCategory) {
    if (category === "hermes") return this.getHermesProvider();
    if (category === "asr") return this.getAsrProvider();
    return this.getVisionProvider();
  }
}
