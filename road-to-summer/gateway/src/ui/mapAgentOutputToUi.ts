import type { CurrentSession, HermesOutput, PlanCard, PlanItem, PlanPatchOutput, TrainingCard } from "../hermes/types.ts";

export type UiStatePatch = {
  current_session?: CurrentSession;
  current_plan?: PlanCard;
  chat_message: string;
  quick_actions?: string[];
  training_card?: TrainingCard;
  memory_updates?: unknown[];
};

function isPlanItem(item: PlanItem | string): item is PlanItem {
  return typeof item === "object" && item !== null && "exercise" in item;
}

function firstPlanItem(plan?: PlanCard | null): PlanItem | undefined {
  return plan?.sections.flatMap((section) => section.items).find(isPlanItem);
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalized(value?: string): string {
  return (value || "").replace(/\s+/g, "").toLowerCase();
}

function itemMatchesPatch(item: PlanItem, patch: PlanPatchOutput["patch"], currentSession: CurrentSession): boolean {
  const exercise = normalized(item.exercise);
  const candidates = [
    patch.target_exercise,
    patch.from,
    currentSession.current_exercise
  ].map(normalized).filter(Boolean);
  return candidates.some((candidate) => candidate.includes(exercise) || exercise.includes(candidate));
}

function patchPlanItem(item: PlanItem, patch: PlanPatchOutput["patch"]): PlanItem {
  if (patch.operation === "replace_exercise") {
    const nextExercise = patch.to || item.exercise;
    return {
      ...item,
      exercise: nextExercise,
      cue: patch.next_instruction || item.cue,
      substitutions: uniq([item.exercise, ...(item.substitutions || [])])
    };
  }

  if (patch.operation === "update_cue") {
    return {
      ...item,
      cue: patch.next_instruction || patch.to || item.cue
    };
  }

  if (patch.operation === "adjust_load") {
    return {
      ...item,
      intensity: patch.to || item.intensity,
      cue: patch.next_instruction || item.cue
    };
  }

  if (patch.operation === "reduce_sets" || patch.operation === "add_set") {
    return {
      ...item,
      sets: patch.to || item.sets,
      cue: patch.next_instruction || item.cue
    };
  }

  if (patch.operation === "extend_rest") {
    return {
      ...item,
      rest: patch.to || item.rest,
      cue: patch.next_instruction || item.cue
    };
  }

  return item;
}

function applyPlanPatch(plan: PlanCard | undefined, patch: PlanPatchOutput["patch"], currentSession: CurrentSession): PlanCard | undefined {
  if (!plan) return undefined;
  let changed = false;
  const sections = plan.sections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (!isPlanItem(item) || !itemMatchesPatch(item, patch, currentSession)) return item;
      changed = true;
      return patchPlanItem(item, patch);
    })
  }));
  return changed ? { ...plan, sections } : plan;
}

function nextExerciseFromPatch(output: PlanPatchOutput, currentSession: CurrentSession): string | undefined {
  if (output.patch.operation === "replace_exercise" && output.patch.to) return output.patch.to;
  return output.patch.target_exercise || currentSession.current_exercise;
}

export function mapAgentOutputToUi(output: HermesOutput, currentSession: CurrentSession, currentPlan?: PlanCard | null): UiStatePatch {
  if (output.type === "training_plan") {
    const firstItem = firstPlanItem(output.plan_card);
    const targetDate = output.plan_card.target_date || currentSession.target_date;
    return {
      chat_message: output.chat_message,
      current_plan: output.plan_card,
      quick_actions: output.quick_actions,
      current_session: {
        ...currentSession,
        phase: "warmup",
        theme: output.plan_card.title,
        goal: output.plan_card.goal,
        target_date: targetDate,
        target_date_label: output.plan_card.date_label || currentSession.target_date_label,
        timezone: output.plan_card.timezone || currentSession.timezone,
        current_exercise: firstItem?.exercise,
        current_set: 1,
        plan_card: output.plan_card
      }
    };
  }

  if (output.type === "plan_patch") {
    const patchedPlan = applyPlanPatch((currentPlan || currentSession.plan_card) as PlanCard | undefined, output.patch, currentSession);
    return {
      chat_message: output.chat_message,
      quick_actions: output.quick_actions,
      memory_updates: output.memory_updates,
      current_plan: patchedPlan,
      current_session: {
        ...currentSession,
        current_exercise: nextExerciseFromPatch(output, currentSession),
        plan_card: patchedPlan || currentSession.plan_card,
        events: [...(currentSession.events || []), output.patch]
      }
    };
  }

  return {
    chat_message: output.chat_message,
    training_card: output.type === "training_card" ? output.training_card : undefined,
    memory_updates: output.type === "training_card" ? output.memory_updates : undefined,
    current_session: {
      ...currentSession,
      phase: output.type === "training_card" ? "ended" : currentSession.phase
    }
  };
}
