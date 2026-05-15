import type { HermesOutput, HermesResponse } from "./types.ts";
import { validateAgentOutput } from "../ui/validateAgentOutput.ts";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function numberField(source: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

function adjustmentToText(source: Record<string, unknown>): string | undefined {
  const explicit = stringField(source, ["to", "new_value", "target_value"]);
  if (explicit) return explicit;

  const direction = stringField(source, ["direction"]);
  const magnitude = stringField(source, ["adjustment_magnitude", "magnitude", "amount"]);
  if (!direction && !magnitude) return undefined;

  const directionLabel =
    direction === "increase"
      ? "增加"
      : direction === "decrease"
        ? "降低"
        : direction === "hold" || direction === "maintain"
          ? "保持"
          : direction;
  return [directionLabel, magnitude].filter(Boolean).join(" ");
}

function normalizePatchOperation(operation?: string) {
  if (!operation) return undefined;
  const normalizedOperation = operation.trim();
  const aliasKey = normalizedOperation.toLowerCase();
  const aliases: Record<string, string> = {
    load_adjustment: "adjust_load",
    adjust_weight: "adjust_load",
    change_load: "adjust_load",
    swap_exercise: "replace_exercise",
    substitute_exercise: "replace_exercise",
    substitution: "replace_exercise",
    replacement: "replace_exercise",
    cue_update: "update_cue",
    form_cue: "update_cue",
    technique_cue: "update_cue",
    rest_extension: "extend_rest",
    extend_recovery: "extend_rest",
    finish_session: "end_session",
    stop_session: "end_session"
  };
  return aliases[aliasKey] || normalizedOperation;
}

function normalizePlanPatch(output: Record<string, unknown>): unknown | undefined {
  if (output.type === "plan_patch" && isObject(output.patch)) return output;

  const shorthandPatch = isObject(output.plan_patch)
    ? output.plan_patch
    : isObject(output.patch)
      ? output.patch
      : output;

  const operation = normalizePatchOperation(
    stringField(shorthandPatch, ["operation", "patch_operation", "action", "action_type"])
  );
  const reason = stringField(shorthandPatch, ["reason", "reasoning", "decision_reason", "why"]);
  const nextInstruction = stringField(shorthandPatch, [
    "next_instruction",
    "next_action",
    "instruction",
    "recommendation",
    "coach_instruction"
  ]);

  if (!operation || !reason || !nextInstruction) return undefined;

  const targetExercise =
    stringField(shorthandPatch, ["target_exercise", "exercise", "current_exercise", "target"]) || "当前动作";

  return {
    ...output,
    type: "plan_patch",
    chat_message: typeof output.chat_message === "string" ? output.chat_message : nextInstruction,
    patch: {
      operation,
      target_exercise: targetExercise,
      target_item_id: stringField(shorthandPatch, ["target_item_id", "item_id"]),
      target_section_id: stringField(shorthandPatch, ["target_section_id", "section_id"]),
      applies_to_plan_id: stringField(shorthandPatch, ["applies_to_plan_id", "plan_id"]),
      applies_to_revision: numberField(shorthandPatch, ["applies_to_revision", "plan_revision"]),
      from: stringField(shorthandPatch, ["from", "old_value", "previous_value"]),
      to: adjustmentToText(shorthandPatch),
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
  if (output.type === "plan_patch") {
    const normalizedPatch = normalizePlanPatch(output);
    if (normalizedPatch) return normalizedPatch;
  }
  if (typeof output.type === "string") return output;

  const wrappers = ["hermes_output", "output", "result", "response", "data"] as const;
  for (const key of wrappers) {
    const value = output[key];
    if (isObject(value)) {
      const normalized = normalizeHermesOutput(value);
      if (isObject(normalized) && typeof normalized.type === "string") return normalized;
    }
  }

  const normalizedPatch = normalizePlanPatch(output);
  if (normalizedPatch) return normalizedPatch;

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
