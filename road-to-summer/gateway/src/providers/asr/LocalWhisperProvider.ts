import type { AsrProvider, ProviderInstance, ProviderTestResult, TranscribeAudioInput, TranscribeAudioOutput } from "../types.ts";

export class LocalWhisperProvider implements AsrProvider {
  readonly instance: ProviderInstance;

  constructor(instance: ProviderInstance) {
    this.instance = instance;
  }

  async transcribe(_input: TranscribeAudioInput): Promise<TranscribeAudioOutput> {
    throw new Error("Local Whisper provider is not wired yet. Configure a local HTTP endpoint or CLI adapter first.");
  }

  async test(): Promise<ProviderTestResult> {
    return {
      ok: false,
      providerId: this.instance.id,
      providerType: this.instance.type,
      message: "Local Whisper provider is a placeholder until a local endpoint/CLI is configured."
    };
  }
}
