import type { AsrProvider, ProviderInstance, ProviderTestResult, TranscribeAudioInput, TranscribeAudioOutput } from "../types.ts";

export class MockAsrProvider implements AsrProvider {
  readonly instance: ProviderInstance;

  constructor(instance: ProviderInstance) {
    this.instance = instance;
  }

  async transcribe(input: TranscribeAudioInput): Promise<TranscribeAudioOutput> {
    const started = Date.now();
    return {
      text: input.audio || "高位下拉有人了",
      confidence: 0.9,
      provider: this.instance.id,
      durationMs: Date.now() - started,
      raw: {
        note: "Mock ASR treats audio as transcript text."
      }
    };
  }

  async test(): Promise<ProviderTestResult> {
    const result = await this.transcribe({ audio: "高位下拉有人了" });
    return {
      ok: result.text.length > 0,
      providerId: this.instance.id,
      providerType: this.instance.type,
      message: "Mock ASR provider is available."
    };
  }
}
