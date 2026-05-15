import type { CurrentSession, HermesOutput, PlanCard, PlanItem, PlanPatchOutput, TrainingCard } from "../hermes/types.ts";
import { ensurePlanState, findPlanItem, firstPlanItem } from "../state/planState.ts";
import type { AgentUiDocument } from "./agentUi.ts";

export type UiStatePatch = {
  current_session?: CurrentSession;
  current_plan?: PlanCard;
  chat_message: string;
  quick_actions?: string[];
  training_card?: TrainingCard;
  memory_updates?: unknown[];
  agent_ui?: AgentUiDocument;
};

function isPlanItem(item: PlanItem | string): item is PlanItem {
  return typeof item === "object" && item !== null && "exercise" in item;
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalized(value?: string): string {
  return (value || "").replace(/\s+/g, "").toLowerCase();
}

function itemMatchesPatch(item: PlanItem, patch: PlanPatchOutput["patch"], currentSession: CurrentSession): boolean {
  if (patch.target_item_id) return item.item_id === patch.target_item_id;
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
  const basePlan = ensurePlanState(plan);
  let changed = false;
  const sections = basePlan.sections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (!isPlanItem(item) || !itemMatchesPatch(item, patch, currentSession)) return item;
      changed = true;
      return patchPlanItem(item, patch);
    })
  }));
  return changed ? { ...basePlan, plan_revision: (basePlan.plan_revision || 1) + 1, sections } : basePlan;
}

function nextPlanItemFromPatch(plan: PlanCard | undefined, output: PlanPatchOutput, currentSession: CurrentSession): PlanItem | undefined {
  const sessionTarget = output.session_update?.current_item_id;
  return findPlanItem(plan, sessionTarget || output.patch.target_item_id, output.session_update?.current_exercise || output.patch.to || output.patch.target_exercise || currentSession.current_exercise);
}

function nextExerciseFromPatch(output: PlanPatchOutput, currentSession: CurrentSession, plan?: PlanCard): string | undefined {
  if (output.session_update?.current_exercise) return output.session_update.current_exercise;
  const targetItem = nextPlanItemFromPatch(plan, output, currentSession);
  if (targetItem?.exercise) return targetItem.exercise;
  if (output.patch.operation === "replace_exercise" && output.patch.to) return output.patch.to;
  return output.patch.target_exercise || currentSession.current_exercise;
}

export function mapAgentOutputToUi(output: HermesOutput, currentSession: CurrentSession, currentPlan?: PlanCard | null): UiStatePatch {
  if (output.type === "training_plan") {
    const planCard = ensurePlanState(output.plan_card);
    const firstItem = firstPlanItem(planCard);
    const targetDate = planCard.target_date || currentSession.target_date;
    return {
      chat_message: output.chat_message,
      current_plan: planCard,
      quick_actions: output.quick_actions,
      current_session: {
        ...currentSession,
        phase: "warmup",
        theme: planCard.title,
        goal: planCard.goal,
        target_date: targetDate,
        target_date_label: planCard.date_label || currentSession.target_date_label,
        timezone: planCard.timezone || currentSession.timezone,
        plan_id: planCard.plan_id,
        plan_revision: planCard.plan_revision,
        current_item_id: firstItem?.item_id,
        current_exercise: firstItem?.exercise,
        current_set: 1,
        plan_card: planCard
      }
    };
  }

  if (output.type === "plan_patch") {
    const patchedPlan = applyPlanPatch((currentPlan || currentSession.plan_card) as PlanCard | undefined, output.patch, currentSession);
    const nextItem = nextPlanItemFromPatch(patchedPlan, output, currentSession);
    return {
      chat_message: output.chat_message,
      quick_actions: output.quick_actions,
      memory_updates: output.memory_updates,
      current_plan: patchedPlan,
      current_session: {
        ...currentSession,
        ...(output.session_update || {}),
        phase: output.patch.operation === "end_session" ? "ended" : output.session_update?.phase || currentSession.phase,
        plan_id: patchedPlan?.plan_id || currentSession.plan_id,
        plan_revision: patchedPlan?.plan_revision || currentSession.plan_revision,
        current_item_id: output.session_update?.current_item_id || nextItem?.item_id || currentSession.current_item_id,
        current_exercise: nextExerciseFromPatch(output, currentSession, patchedPlan),
        plan_card: patchedPlan || output.session_update?.plan_card || currentSession.plan_card,
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
