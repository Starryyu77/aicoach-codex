import type { HermesOutput, HermesResponse } from "./types.ts";
import { validateAgentOutput } from "../ui/validateAgentOutput.ts";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const candidates = [
    trimmed,
    trimmed.replace(/,\s*([}\]])/g, "$1")
  ];
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next repair candidate before falling back to object extraction.
    }
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const candidate = trimmed.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        return JSON.parse(candidate.replace(/,\s*([}\]])/g, "$1"));
      }
    }
    throw new Error("Hermes response is not valid JSON");
  }
}

function normalizeHermesOutput(output: unknown): unknown {
  if (!isObject(output)) return output;
  if (typeof output.type === "string") return output;

  const wrappers = ["hermes_output", "output", "result", "response", "data"] as const;
  for (const key of wrappers) {
    const value = output[key];
    if (isObject(value)) {
      const normalized = normalizeHermesOutput(value);
      if (isObject(normalized) && typeof normalized.type === "string") return normalized;
    }
  }

  const shorthandPatch = isObject(output.plan_patch)
    ? output.plan_patch
    : isObject(output.patch)
      ? output.patch
      : output;
  const operation = shorthandPatch.operation;
  const targetExercise = shorthandPatch.target_exercise;
  const reason = shorthandPatch.reason;
  const nextInstruction = shorthandPatch.next_instruction;
  if (
    typeof operation === "string" &&
    typeof targetExercise === "string" &&
    typeof reason === "string" &&
    typeof nextInstruction === "string"
  ) {
    return {
      type: "plan_patch",
      chat_message: typeof output.chat_message === "string" ? output.chat_message : nextInstruction,
      patch: {
        operation,
        target_exercise: targetExercise,
        from: typeof shorthandPatch.from === "string" ? shorthandPatch.from : undefined,
        to: typeof shorthandPatch.to === "string" ? shorthandPatch.to : undefined,
        reason,
        next_instruction: nextInstruction
      },
      quick_actions: Array.isArray(output.quick_actions) ? output.quick_actions : [],
      memory_updates: Array.isArray(output.memory_updates) ? output.memory_updates : undefined,
      session_update: isObject(output.session_update)
        ? output.session_update
        : isObject(shorthandPatch.session_update)
          ? shorthandPatch.session_update
          : undefined
    };
  }

  if (isObject(output.training_plan)) {
    return {
      type: "training_plan",
      chat_message: typeof output.chat_message === "string" ? output.chat_message : "",
      plan_card: output.training_plan,
      quick_actions: Array.isArray(output.quick_actions) ? output.quick_actions : []
    };
  }

  if (isObject(output.training_card)) {
    return {
      type: "training_card",
      chat_message: typeof output.chat_message === "string" ? output.chat_message : "",
      training_card: output.training_card,
      memory_updates: Array.isArray(output.memory_updates) ? output.memory_updates : []
    };
  }

  return output;
}

export function parseHermesResponse(response: HermesResponse): HermesOutput {
  const parsed = typeof response.output === "string" ? extractJson(response.output) : response.output;
  const output = normalizeHermesOutput(parsed);
  const result = validateAgentOutput(output);
  if (!result.valid) {
    throw new Error(`Invalid Hermes output: ${result.error}`);
  }
  return output as HermesOutput;
}
