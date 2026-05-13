import { getSecret } from "../../config/secrets.ts";
import type { AsrProvider, ProviderInstance, ProviderTestResult, TranscribeAudioInput, TranscribeAudioOutput } from "../types.ts";

function stripDataUrl(value: string) {
  return value.includes(",") ? value.split(",").at(-1) || "" : value;
}

function parseCredential(value: string) {
  const parts = value.split(":");
  if (parts.length >= 2) {
    const appKey = parts.shift()?.trim() || "";
    const accessKey = parts.join(":").trim();
    return { mode: "legacy", appKey, accessKey };
  }
  return { mode: "new", apiKey: value.trim() };
}

function resultText(raw: any) {
  return raw?.result?.text || raw?.text || raw?.result?.utterances?.map((item: any) => item.text).filter(Boolean).join("") || "";
}

export class DoubaoAsrProvider implements AsrProvider {
  readonly instance: ProviderInstance;
  private runtimeRoot?: string;

  constructor(instance: ProviderInstance, options: { runtimeRoot?: string } = {}) {
    this.instance = instance;
    this.runtimeRoot = options.runtimeRoot;
  }

  async transcribe(input: TranscribeAudioInput): Promise<TranscribeAudioOutput> {
    const started = Date.now();
    const credential = await getSecret(this.instance.apiKeyRef, this.runtimeRoot);
    if (!credential) throw new Error(`Missing API key for ${this.instance.id}; set ${this.instance.apiKeyRef}`);
    if (!input.audio && !input.audioUrl) throw new Error("Doubao ASR requires audio base64 data or an audioUrl.");

    const parsed = parseCredential(credential);
    const requestId = crypto.randomUUID();
    const resourceId = String(this.instance.extra?.resourceId || "volc.bigasr.auc_turbo");
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "X-Api-Resource-Id": resourceId,
      "X-Api-Request-Id": requestId,
      "X-Api-Sequence": "-1"
    };
    if (parsed.mode === "legacy") {
      headers["X-Api-App-Key"] = parsed.appKey || "";
      headers["X-Api-Access-Key"] = parsed.accessKey || "";
    } else {
      headers["X-Api-Key"] = parsed.apiKey || "";
    }

    const requestOptions: Record<string, unknown> = {
      model_name: this.instance.model || "bigmodel"
    };
    for (const key of ["enable_itn", "enable_punc", "enable_ddc", "enable_speaker_info"]) {
      if (key in (this.instance.extra || {})) requestOptions[key] = this.instance.extra?.[key];
    }

    const response = await fetch(this.instance.baseUrl || "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash", {
      method: "POST",
      headers,
      body: JSON.stringify({
        user: {
          uid: parsed.mode === "legacy" ? parsed.appKey : String(this.instance.extra?.uid || "road-to-summer")
        },
        audio: input.audioUrl ? { url: input.audioUrl } : { data: stripDataUrl(input.audio || "") },
        request: requestOptions
      }),
      signal: AbortSignal.timeout(this.instance.timeoutMs || 60000)
    });
    const raw = await response.json().catch(async () => ({ text: await response.text() }));
    const statusCode = response.headers.get("x-api-status-code");
    const statusMessage = response.headers.get("x-api-message");
    if (!response.ok || (statusCode && statusCode !== "20000000")) {
      throw new Error(`Doubao ASR error ${response.status} ${statusCode || ""} ${statusMessage || ""}: ${JSON.stringify(raw)}`);
    }
    return {
      text: resultText(raw),
      provider: this.instance.id,
      durationMs: Date.now() - started,
      raw: {
        body: raw,
        statusCode,
        statusMessage,
        logId: response.headers.get("x-tt-logid"),
        requestId
      }
    };
  }

  async test(): Promise<ProviderTestResult> {
    const apiKey = await getSecret(this.instance.apiKeyRef, this.runtimeRoot);
    const credentialMode = apiKey ? parseCredential(apiKey).mode : "";
    return {
      ok: Boolean(apiKey),
      providerId: this.instance.id,
      providerType: this.instance.type,
      message: apiKey
        ? `Doubao ASR credential is configured (${credentialMode} auth). Live transcription test requires audio input.`
        : `Missing API key ${this.instance.apiKeyRef}.`
    };
  }
}
