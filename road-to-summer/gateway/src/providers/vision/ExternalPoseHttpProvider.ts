import { getSecret } from "../../config/secrets.ts";
import type { MovementAssessment } from "../../hermes/types.ts";
import type { ProviderInstance, ProviderTestResult, VisionAssessInput, VisionProvider } from "../types.ts";

export class ExternalPoseHttpProvider implements VisionProvider {
  readonly instance: ProviderInstance;
  private runtimeRoot?: string;

  constructor(instance: ProviderInstance, options: { runtimeRoot?: string } = {}) {
    this.instance = instance;
    this.runtimeRoot = options.runtimeRoot;
  }

  async assess(input: VisionAssessInput): Promise<MovementAssessment> {
    const apiKey = await getSecret(this.instance.apiKeyRef, this.runtimeRoot);
    const response = await fetch(this.instance.baseUrl || "http://127.0.0.1:8788/assess", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(this.instance.timeoutMs || 30000)
    });
    const data = await response.json().catch(async () => ({ text: await response.text() }));
    if (!response.ok) throw new Error(`Vision provider error ${response.status}: ${JSON.stringify(data)}`);
    return data as MovementAssessment;
  }

  async test(): Promise<ProviderTestResult> {
    try {
      const result = await this.assess({ exercise: "高位下拉", media: "mock-frame" });
      return {
        ok: result.event_type === "movement_assessment",
        providerId: this.instance.id,
        providerType: this.instance.type,
        message: "External pose provider responded."
      };
    } catch (error) {
      return {
        ok: false,
        providerId: this.instance.id,
        providerType: this.instance.type,
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
