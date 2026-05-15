import type { HermesOutput } from "../hermes/types.ts";

export type ValidationResult = {
  valid: boolean;
  error?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateAgentOutput(output: unknown): ValidationResult {
  if (!isObject(output)) return { valid: false, error: "output is not an object" };
  if (output.type === "training_plan") {
    if (!isObject(output.plan_card)) return { valid: false, error: "training_plan.plan_card missing" };
    if (!Array.isArray(output.plan_card.sections)) return { valid: false, error: "training_plan.plan_card.sections missing" };
    if (!Array.isArray(output.quick_actions)) return { valid: false, error: "training_plan.quick_actions missing" };
    return { valid: true };
  }
  if (output.type === "plan_patch") {
    if (!isObject(output.patch)) return { valid: false, error: "plan_patch.patch missing" };
    if (typeof output.chat_message !== "string") return { valid: false, error: "plan_patch.chat_message missing" };
    return { valid: true };
  }
  if (output.type === "training_card") {
    if (!isObject(output.training_card)) return { valid: false, error: "training_card.training_card missing" };
    if (!Array.isArray(output.memory_updates)) return { valid: false, error: "training_card.memory_updates missing" };
    return { valid: true };
  }
  if (output.type === "training_review") {
    if (!isObject(output.review_card)) return { valid: false, error: "training_review.review_card missing" };
    if (typeof output.chat_message !== "string") return { valid: false, error: "training_review.chat_message missing" };
    return { valid: true };
  }
  return { valid: false, error: `unknown output type ${(output as HermesOutput).type}` };
}
