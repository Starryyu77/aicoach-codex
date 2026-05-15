import type { HermesMessage, HermesResponse } from "../../hermes/types.ts";
import type { HermesProvider, ProviderInstance, ProviderTestResult } from "../types.ts";
import { getSecret } from "../../config/secrets.ts";

type HermesProviderOptions = {
  runtimeRoot?: string;
};

const DEFAULT_HERMES_REQUEST_TIMEOUT_MS = 420000;

function effectiveTimeoutMs(timeoutMs?: number, fallback = DEFAULT_HERMES_REQUEST_TIMEOUT_MS) {
  return Number.isFinite(timeoutMs) && Number(timeoutMs) > 0 ? Number(timeoutMs) : fallback;
}

function timeoutSignal(timeoutMs?: number, fallback = DEFAULT_HERMES_REQUEST_TIMEOUT_MS) {
  return AbortSignal.timeout(effectiveTimeoutMs(timeoutMs, fallback));
}

function isTimeoutError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /abort|timeout|timed out/i.test(`${error.name} ${error.message}`);
}

function normalizeHermesRequestError(error: unknown, timeoutMs?: number): never {
  if (isTimeoutError(error)) {
    throw new Error(
      `Hermes request timed out after ${Math.round(effectiveTimeoutMs(timeoutMs) / 1000)}s. ` +
        "The real Hermes/MiniMax route can be slow; increase this provider's timeoutMs in Settings or retry with a narrower prompt."
    );
  }
  throw error;
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

function buildAuthHeaders(apiKey?: string): Record<string, string> {
  return apiKey ? { authorization: `Bearer ${apiKey}` } : {};
}

function sessionHeaders(input: HermesMessage, apiKey?: string): Record<string, string> {
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
            content: [
              "Use Road to Summer Skill Pack.",
              "All user-facing text must be Chinese, coach-like, and directly useful during training.",
              "For every plan_patch, output a nested patch object. Never output plan_patch as only top-level patch_operation/reasoning/next_action/direction/adjustment_magnitude fields.",
              "Map shorthand concepts into patch.operation, patch.reason, patch.next_instruction, and patch.to before returning JSON.",
              "For training_plan, do not invent a random exercise list; use exercise_selection_context and the chain target -> adaptation -> movement pattern -> candidate pool -> constraints -> role -> variables.",
              "Apply the five-framework bridge: ACE IFT for user context, NASM OPT for phase, NSCA Program Design for structure/load, ACSM 2026 Resistance Training for variables, and RPE/RIR Autoregulation for live adjustment.",
              "Include plan_card.framework_trace with concise framework decisions when returning a training_plan.",
              "Include plan_card.official_source_trace with official source URL, source location, principle, applied decision, and why it matters for machine traceability, but do not make it a standalone user-facing reference table.",
              "Every structured PlanItem should include role, movement_pattern, primary_muscles, selection_reason, source_note, common_mistakes, adjustment_rule, substitutions, sets, reps, intensity, rest, and cue when possible.",
              "source_note must be a short Chinese coach explanation such as: 教练依据：这里参考 NSCA 的训练结构原则，把这个动作放在主训练后补足动作模式。",
              "For compound in-session feedback, resolve conflicts explicitly: pain/red-flag/joint instability first, then equipment/location constraints, then completed-set state updates, then load progression or extra-set requests, then technique cue requests. If the user says weight is too light but also reports shoulder discomfort, do not simply increase load.",
              "If one message mixes a past completed session and future planning, obey explicit sequencing words. If the user says 先保存 or 先记录 the past session, return training_card first and put the future concern in next_session_suggestions.",
              "For in-session plan_patch, understand ordinary natural Chinese feedback directly. Do not ask the user to classify the feedback. Map examples: 太轻了 -> adjust_load upward; 太重了 -> adjust_load downward; 感觉不到目标肌肉 -> update_cue; 不会做 -> update_cue with plain-language execution steps; 要不要加组 -> add_set only if quality/risk allow; 有点累 -> extend_rest or reduce load; 有点疼 or 不舒服 -> risk-safe guidance; 器械有人 or 坏了 -> replace_exercise.",
              "Never output the generic sentence 请确认这是器械、疲劳、疼痛、动作感受，还是训练结束. Give the next concrete coaching instruction instead.",
              "Output only valid JSON: training_plan, plan_patch, training_card, or training_review."
            ].join(" ")
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
    }).catch((error) => normalizeHermesRequestError(error, this.instance.timeoutMs));

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
        signal: timeoutSignal(this.instance.timeoutMs, 8000)
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
          signal: timeoutSignal(this.instance.timeoutMs, 8000)
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
