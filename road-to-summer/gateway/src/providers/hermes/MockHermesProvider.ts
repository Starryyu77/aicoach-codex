import { MockHermesClient } from "../../hermes/HermesClient.ts";
import type { HermesMessage, HermesResponse } from "../../hermes/types.ts";
import type { HermesProvider, ProviderInstance, ProviderTestResult } from "../types.ts";

export class MockHermesProvider implements HermesProvider {
  readonly instance: ProviderInstance;
  private client = new MockHermesClient();

  constructor(instance: ProviderInstance) {
    this.instance = instance;
  }

  sendMessage(input: HermesMessage): Promise<HermesResponse> {
    return this.client.sendMessage(input);
  }

  async test(): Promise<ProviderTestResult> {
    const result = await this.sendMessage({
      source: "text",
      raw_text: "今天该练什么？",
      current_session: {},
      instruction: "Return strict training_plan JSON."
    });
    return {
      ok: typeof result.output === "object",
      providerId: this.instance.id,
      providerType: this.instance.type,
      message: "Mock Hermes provider is available."
    };
  }
}
