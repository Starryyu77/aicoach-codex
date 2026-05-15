import type { HermesOutput, HermesResponse } from "./types.ts";
import { validateAgentOutput } from "../ui/validateAgentOutput.ts";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function asPatchString(value: unknown, fallback = ""): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (isObject(value)) {
    return asString(
      value.exercise ||
        value.name ||
        value.title ||
        value.label ||
        value.value ||
        value.next_instruction ||
        value.cue,
      fallback
    );
  }
  return fallback;
}

function normalizePatchOperation(value: unknown): string {
  const operation = asString(value, "update_cue").trim();
  const normalized = operation.toLowerCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, string> = {
    swap_exercise: "replace_exercise",
    substitute_exercise: "replace_exercise",
    change_exercise: "replace_exercise",
    replace: "replace_exercise",
    adjust_weight: "adjust_load",
    change_load: "adjust_load",
    increase_load: "adjust_load",
    decrease_load: "adjust_load",
    cue: "update_cue",
    update_instruction: "update_cue",
    continue: "continue_current"
  };
  return aliases[normalized] || normalized;
}

function normalizePlanPatch(patch: Record<string, unknown>): Record<string, unknown> {
  return {
    ...patch,
    operation: normalizePatchOperation(patch.operation),
    target_item_id: asPatchString(patch.target_item_id || patch.item_id, ""),
    target_section_id: asPatchString(patch.target_section_id || patch.section_id, ""),
    applies_to_plan_id: asPatchString(patch.applies_to_plan_id || patch.plan_id, ""),
    applies_to_revision: typeof patch.applies_to_revision === "number"
      ? patch.applies_to_revision
      : typeof patch.plan_revision === "number"
        ? patch.plan_revision
        : undefined,
    target_exercise: asPatchString(
      patch.target_exercise || patch.exercise || patch.target || patch.item || patch.current_exercise,
      "当前动作"
    ),
    from: asPatchString(patch.from, ""),
    to: asPatchString(patch.to || patch.replacement || patch.new_exercise || patch.next_exercise, ""),
    reason: asPatchString(patch.reason, ""),
    next_instruction: asPatchString(patch.next_instruction || patch.instruction || patch.cue || patch.to, "")
  };
}

function normalizeSessionUpdate(value: unknown, output: Record<string, unknown>): unknown {
  const sessionUpdate = isObject(value) ? { ...value } : {};
  const planCandidate = sessionUpdate.plan_card || output.updated_plan || output.current_plan || output.plan_card;
  if (isObject(planCandidate)) {
    sessionUpdate.plan_card = normalizePlanCard(planCandidate);
  }
  return Object.keys(sessionUpdate).length ? sessionUpdate : undefined;
}

function normalizeQuickActions(value: unknown): string[] {
  return asArray(value)
    .map((item) => {
      if (typeof item === "string") return item;
      if (isObject(item)) return asString(item.label || item.action || item.next_instruction);
      return "";
    })
    .filter(Boolean);
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
  if (output.type === "training_plan" && isObject(output.plan_card)) {
    const planCard = normalizePlanCard(output.plan_card);
    return {
      ...output,
      plan_card: planCard,
      quick_actions: normalizeQuickActions(output.quick_actions).length
        ? normalizeQuickActions(output.quick_actions)
        : normalizeQuickActions(planCard.quick_actions)
    };
  }
  if (output.type === "plan_patch" && isObject(output.patch)) {
    return {
      ...output,
      patch: normalizePlanPatch(output.patch),
      quick_actions: normalizeQuickActions(output.quick_actions),
      memory_updates: Array.isArray(output.memory_updates) ? output.memory_updates : undefined,
      session_update: normalizeSessionUpdate(output.session_update, output)
    };
  }
  if (output.type === "training_review") {
    return {
      ...output,
      quick_actions: normalizeQuickActions(output.quick_actions)
    };
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
        ...normalizePlanPatch({
          ...shorthandPatch,
          operation,
          target_exercise: targetExercise,
          reason,
          next_instruction: nextInstruction
        })
      },
      quick_actions: normalizeQuickActions(output.quick_actions),
      memory_updates: Array.isArray(output.memory_updates) ? output.memory_updates : undefined,
      session_update: normalizeSessionUpdate(
        isObject(output.session_update) ? output.session_update : shorthandPatch.session_update,
        output
      )
    };
  }

  if (isObject(output.training_plan)) {
    const planCard = normalizePlanCard(output.training_plan);
    return {
      type: "training_plan",
      chat_message: typeof output.chat_message === "string"
        ? output.chat_message
        : `已生成 ${asString(planCard.title, "训练计划")}。`,
      plan_card: planCard,
      quick_actions: normalizeQuickActions(output.quick_actions).length
        ? normalizeQuickActions(output.quick_actions)
        : normalizeQuickActions(planCard.quick_actions)
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

function exerciseFromSectionName(sectionName?: string): string {
  const raw = asString(sectionName).trim();
  if (!raw) return "训练项目";
  const afterColon = raw.split(/[：:]/).pop() || raw;
  const withoutTime = afterColon.replace(/[（(][^）)]*[）)]/g, "").trim();
  const withoutPrefix = withoutTime.replace(/^(热身|收尾|主训[一二三四五六七八九十]?|辅助训练?|功能\s*\/?\s*核心)\s*/, "").trim();
  return withoutPrefix || withoutTime || raw;
}

function normalizePlanItem(item: unknown, sectionName?: string): unknown {
  if (!isObject(item)) return item;
  return {
    ...item,
    exercise: asString(item.exercise || item.name, exerciseFromSectionName(sectionName)),
    role: asString(item.role, "main"),
    movement_pattern: asString(item.movement_pattern, ""),
    primary_muscles: asArray(item.primary_muscles).map((value) => asString(value)).filter(Boolean),
    selection_reason: asString(item.selection_reason || item.reason, ""),
    source_note: asString(item.source_note, ""),
    common_mistakes: asArray(item.common_mistakes).map((value) => asString(value)).filter(Boolean),
    adjustment_rule: asString(item.adjustment_rule, ""),
    sets: asString(item.sets, "1"),
    reps: asString(item.reps, "-"),
    intensity: asString(item.intensity, "-"),
    rest: asString(item.rest, "-"),
    cue: asString(item.cue || item.next_instruction, ""),
    substitutions: asArray(item.substitutions).map((value) => asString(value)).filter(Boolean)
  };
}

function normalizePlanCard(plan: Record<string, unknown>): Record<string, unknown> {
  const rawSections = asArray(plan.sections);
  const rawItems = asArray(plan.items || plan.exercises || plan.training_items);
  const sections = rawSections.length
    ? rawSections.map((section) => {
        if (!isObject(section)) return section;
        return {
          ...section,
          name: asString(section.name || section.title, "训练计划"),
          items: asArray(section.items).map((item) => normalizePlanItem(item, asString(section.name || section.title)))
        };
      })
    : rawItems.length
      ? [{ name: "训练计划", items: rawItems.map((item) => normalizePlanItem(item, "训练计划")) }]
      : plan.sections;

  return {
    ...plan,
    title: asString(plan.title || plan.theme || plan.training_theme, "训练计划"),
    duration: asString(plan.duration || (plan.duration_minutes ? `${plan.duration_minutes} 分钟` : undefined), ""),
    goal: asString(plan.goal || plan.today_goal, ""),
    sections,
    risk_notes: asArray(plan.risk_notes).map((value) => asString(value)).filter(Boolean),
    reasoning: asString(plan.reasoning, ""),
    framework_trace: asArray(plan.framework_trace).map((value) => asString(value)).filter(Boolean),
    official_source_trace: asArray(plan.official_source_trace),
    decision_basis: asArray(plan.decision_basis).map((value) => asString(value)).filter(Boolean),
    recent_training_summary: asArray(plan.recent_training_summary).map((value) => asString(value)).filter(Boolean),
    quality_warnings: asArray(plan.quality_warnings).map((value) => asString(value)).filter(Boolean)
  };
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
