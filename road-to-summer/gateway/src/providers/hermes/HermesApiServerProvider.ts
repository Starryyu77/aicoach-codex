import type { HermesMessage, HermesResponse } from "../../hermes/types.ts";
import type { HermesProvider, ProviderInstance, ProviderTestResult } from "../types.ts";
import { getSecret } from "../../config/secrets.ts";

type HermesProviderOptions = {
  runtimeRoot?: string;
};

function timeoutSignal(timeoutMs = 30000) {
  return AbortSignal.timeout(timeoutMs);
}

function messageToPrompt(input: HermesMessage) {
  return [
    "You are Hermes running the road_to_summer fitness Skill Pack.",
    "If you inspect skills, use the exact skill name road_to_summer.",
    "Return only valid JSON matching output_contract.md.",
    "Do not return markdown fences or natural-language-only answers.",
    "HermesMessage:",
    JSON.stringify(input, null, 2)
  ].join("\n");
}

function parseChatCompletion(data: any): string {
  if (typeof data?.choices?.[0]?.message?.content === "string") return data.choices[0].message.content;
  if (typeof data?.output_text === "string") return data.output_text;
  if (typeof data?.content === "string") return data.content;
  return JSON.stringify(data);
}

function buildAuthHeaders(apiKey?: string) {
  return apiKey ? { authorization: `Bearer ${apiKey}` } : {};
}

function sessionHeaders(input: HermesMessage, apiKey?: string) {
  if (!apiKey) return {};
  const sessionId = input.current_session?.id;
  return {
    ...(sessionId ? { "X-Hermes-Session-Id": sessionId } : {}),
    "X-Hermes-Session-Key": "road-to-summer"
  };
}

export class HermesApiServerProvider implements HermesProvider {
  readonly instance: ProviderInstance;
  private runtimeRoot?: string;

  constructor(instance: ProviderInstance, options: HermesProviderOptions = {}) {
    this.instance = instance;
    this.runtimeRoot = options.runtimeRoot;
  }

  async sendMessage(input: HermesMessage): Promise<HermesResponse> {
    const baseUrl = this.instance.baseUrl || "http://127.0.0.1:8642/v1";
    const apiKey = await getSecret(this.instance.apiKeyRef, this.runtimeRoot);
    const endpointMode = this.instance.endpointMode || "chat_completions";

    if (endpointMode !== "chat_completions") {
      throw new Error(`Hermes endpointMode ${endpointMode} is not implemented yet.`);
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...buildAuthHeaders(apiKey),
        ...sessionHeaders(input, apiKey)
      },
      body: JSON.stringify({
        model: this.instance.model || "hermes-agent",
        messages: [
          {
            role: "system",
            content: "Use Road to Summer Skill Pack. Output only valid JSON: training_plan, plan_patch, training_card, or training_review."
          },
          {
            role: "user",
            content: messageToPrompt(input)
          }
        ],
        temperature: 0.2,
        stream: false
      }),
      signal: timeoutSignal(this.instance.timeoutMs)
    });

    const data = await response.json().catch(async () => ({ text: await response.text() }));
    if (!response.ok) {
      throw new Error(`Hermes API error ${response.status}: ${JSON.stringify(data)}`);
    }

    return {
      output: parseChatCompletion(data),
      raw: {
        data,
        hermesSessionId: response.headers.get("x-hermes-session-id"),
        hermesSessionKey: response.headers.get("x-hermes-session-key"),
        hermesCompleted: response.headers.get("x-hermes-completed")
      },
      provider: "hermes"
    };
  }

  async test(): Promise<ProviderTestResult> {
    const baseUrl = (this.instance.baseUrl || "http://127.0.0.1:8642/v1").replace(/\/$/, "");
    const apiKey = await getSecret(this.instance.apiKeyRef, this.runtimeRoot);
    try {
      const response = await fetch(`${baseUrl}/capabilities`, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...buildAuthHeaders(apiKey)
        },
        signal: timeoutSignal(this.instance.timeoutMs || 8000)
      });
      const details = await response.json().catch(async () => ({ text: await response.text() }));
      if (!response.ok) throw new Error(`Hermes capability check failed ${response.status}: ${JSON.stringify(details)}`);
      return {
        ok: true,
        providerId: this.instance.id,
        providerType: this.instance.type,
        message: "Hermes API Server capabilities endpoint responded.",
        details
      };
    } catch (error) {
      try {
        const response = await fetch(`${baseUrl}/models`, {
          method: "GET",
          headers: {
            accept: "application/json",
            ...buildAuthHeaders(apiKey)
          },
          signal: timeoutSignal(this.instance.timeoutMs || 8000)
        });
        const details = await response.json().catch(async () => ({ text: await response.text() }));
        if (!response.ok) throw new Error(`Hermes models check failed ${response.status}: ${JSON.stringify(details)}`);
        return {
          ok: true,
          providerId: this.instance.id,
          providerType: this.instance.type,
          message: "Hermes API Server models endpoint responded.",
          details
        };
      } catch (fallbackError) {
        return {
          ok: false,
          providerId: this.instance.id,
          providerType: this.instance.type,
          message: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        };
      }
    }
  }
}
