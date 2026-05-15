import type { HermesMessage, HermesResponse } from "../../hermes/types.ts";
import type { HermesProvider, ProviderInstance, ProviderTestResult } from "../types.ts";
import { getSecret } from "../../config/secrets.ts";

type HermesProviderOptions = {
  runtimeRoot?: string;
};

const DEFAULT_TIMEOUT_MS = 90000;

function effectiveTimeoutMs(timeoutMs?: number) {
  return Number.isFinite(timeoutMs) && Number(timeoutMs) > 0 ? Number(timeoutMs) : DEFAULT_TIMEOUT_MS;
}

function endpointFor(baseUrl: string) {
  const normalized = baseUrl.replace(/\/$/, "");
  if (/\/v1\/messages$/.test(normalized)) return normalized;
  if (/\/v1$/.test(normalized)) return `${normalized}/messages`;
  return `${normalized}/v1/messages`;
}

function isBearerAuthEndpoint(baseUrl: string) {
  const normalized = baseUrl.toLowerCase();
  return normalized.includes("api.minimax.io/anthropic") || normalized.includes("api.minimaxi.com/anthropic");
}

function authHeaders(baseUrl: string, apiKey?: string): Record<string, string> {
  if (!apiKey) return {};
  return isBearerAuthEndpoint(baseUrl)
    ? { authorization: `Bearer ${apiKey}` }
    : { "x-api-key": apiKey };
}

function extractAnthropicText(data: any): string {
  if (typeof data?.content === "string") return data.content;
  if (Array.isArray(data?.content)) {
    return data.content
      .map((part: any) => typeof part?.text === "string" ? part.text : "")
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return JSON.stringify(data);
}

function messageToPrompt(input: HermesMessage) {
  return [
    "HermesMessage:",
    JSON.stringify(input, null, 2),
    "",
    "Return exact JSON only. Top-level must be one of:",
    "- training_plan: {\"type\":\"training_plan\",\"chat_message\":\"...\",\"plan_card\":{\"title\":\"...\",\"duration\":\"...\",\"goal\":\"...\",\"sections\":[{\"name\":\"...\",\"items\":[...] }],\"risk_notes\":[],\"reasoning\":\"...\"},\"quick_actions\":[]}",
    "- plan_patch: {\"type\":\"plan_patch\",\"chat_message\":\"...\",\"patch\":{\"operation\":\"update_cue|adjust_load|replace_exercise|reduce_sets|add_set|extend_rest|end_session\",\"target_exercise\":\"...\",\"reason\":\"...\",\"next_instruction\":\"...\"},\"quick_actions\":[]}",
    "- training_card: {\"type\":\"training_card\",\"chat_message\":\"...\",\"training_card\":{...},\"memory_updates\":[]}",
    "- training_review: {\"type\":\"training_review\",\"chat_message\":\"...\",\"review_card\":{...},\"quick_actions\":[]}",
    "Do not use plan_type. Do not wrap the plan under training_plan. For plans, plan_card.sections is required."
  ].join("\n");
}

export class AnthropicCompatibleHermesProvider implements HermesProvider {
  readonly instance: ProviderInstance;
  private runtimeRoot?: string;

  constructor(instance: ProviderInstance, options: HermesProviderOptions = {}) {
    this.instance = instance;
    this.runtimeRoot = options.runtimeRoot;
  }

  async sendMessage(input: HermesMessage): Promise<HermesResponse> {
    const baseUrl = this.instance.baseUrl || "https://api.minimaxi.com/anthropic";
    const apiKey = await getSecret(this.instance.apiKeyRef, this.runtimeRoot);
    const maxTokens = Number(this.instance.extra?.maxTokens) > 0 ? Number(this.instance.extra?.maxTokens) : 3072;
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      ...authHeaders(baseUrl, apiKey)
    };
    const response = await fetch(endpointFor(baseUrl), {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.instance.model || "MiniMax-M2.7-highspeed",
        max_tokens: maxTokens,
        temperature: 0.2,
        system: [
          "You are Hermes for the Road to Summer training app.",
          "Return only valid compact JSON matching the requested output contract.",
          "All user-facing text must be Chinese.",
          "Keep mobile responses concise and directly actionable."
        ].join(" "),
        messages: [
          {
            role: "user",
            content: messageToPrompt(input)
          }
        ]
      }),
      signal: AbortSignal.timeout(effectiveTimeoutMs(this.instance.timeoutMs))
    });
    const data = await response.json().catch(async () => ({ text: await response.text() }));
    if (!response.ok) {
      throw new Error(`Hermes Anthropic API error ${response.status}: ${JSON.stringify(data)}`);
    }
    return {
      output: extractAnthropicText(data),
      raw: { data },
      provider: "hermes"
    };
  }

  async test(): Promise<ProviderTestResult> {
    try {
      const response = await this.sendMessage({
        source: "text",
        raw_text: "连接测试",
        time_context: {
          timezone: "Asia/Singapore",
          now_iso: new Date().toISOString(),
          today: "2026-05-15",
          target_date: "2026-05-15",
          target_date_label: "2026-05-15",
          target_offset_days: 0,
          temporal_intent: "today_session",
          date_source: "default_today",
          mentioned_terms: []
        },
        current_session: {},
        memory_summary: {},
        instruction: "Return {\"type\":\"plan_patch\",\"chat_message\":\"连接正常\",\"patch\":{\"operation\":\"update_cue\",\"target_exercise\":\"连接测试\",\"reason\":\"provider test\",\"next_instruction\":\"继续\"},\"quick_actions\":[]}."
      });
      return {
        ok: Boolean(response.output),
        providerId: this.instance.id,
        providerType: this.instance.type,
        message: "Anthropic-compatible Hermes endpoint responded.",
        details: { provider: response.provider }
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
