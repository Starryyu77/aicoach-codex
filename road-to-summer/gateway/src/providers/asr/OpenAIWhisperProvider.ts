import { getSecret } from "../../config/secrets.ts";
import type { AsrProvider, ProviderInstance, ProviderTestResult, TranscribeAudioInput, TranscribeAudioOutput } from "../types.ts";

type AsrProviderOptions = {
  runtimeRoot?: string;
};

function audioToBlob(input: TranscribeAudioInput): Blob {
  const mimeType = input.mimeType || "audio/webm";
  const value = input.audio || "";
  const base64 = value.includes(",") ? value.split(",").at(-1) || "" : value;
  const bytes = Buffer.from(base64, "base64");
  return new Blob([bytes], { type: mimeType });
}

export class OpenAIWhisperProvider implements AsrProvider {
  readonly instance: ProviderInstance;
  protected runtimeRoot?: string;

  constructor(instance: ProviderInstance, options: AsrProviderOptions = {}) {
    this.instance = instance;
    this.runtimeRoot = options.runtimeRoot;
  }

  protected endpoint() {
    return `${(this.instance.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "")}/audio/transcriptions`;
  }

  async transcribe(input: TranscribeAudioInput): Promise<TranscribeAudioOutput> {
    const started = Date.now();
    const apiKey = await getSecret(this.instance.apiKeyRef, this.runtimeRoot);
    if (!apiKey) throw new Error(`Missing API key for ${this.instance.id}; set ${this.instance.apiKeyRef}`);

    const formData = new FormData();
    formData.set("model", this.instance.model || "whisper-1");
    formData.set("file", audioToBlob(input), input.fileName || "audio.webm");

    const response = await fetch(this.endpoint(), {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: AbortSignal.timeout(this.instance.timeoutMs || 30000)
    });
    const raw = await response.json().catch(async () => ({ text: await response.text() }));
    if (!response.ok) throw new Error(`ASR error ${response.status}: ${JSON.stringify(raw)}`);
    return {
      text: raw.text || "",
      confidence: raw.confidence,
      provider: this.instance.id,
      durationMs: Date.now() - started,
      raw
    };
  }

  async test(): Promise<ProviderTestResult> {
    const apiKey = await getSecret(this.instance.apiKeyRef, this.runtimeRoot);
    return {
      ok: Boolean(apiKey),
      providerId: this.instance.id,
      providerType: this.instance.type,
      message: apiKey ? "API key is configured. Live transcription test requires audio input." : `Missing API key ${this.instance.apiKeyRef}.`
    };
  }
}
