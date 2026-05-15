import { buildTimeContext } from "../time/timeContext.ts";
import { buildExerciseSelectionContext } from "../training/exerciseSelection.ts";
import type { CurrentSession, HermesMessage, InputSource, MovementAssessment, PlanCard, PlanItem, TimeContext, TrainingCard } from "./types.ts";
import path from "node:path";

export type BuildHermesMessageInput = {
  source: InputSource;
  rawText: string;
  currentSession: CurrentSession;
  recentTrainingCards?: TrainingCard[];
  memorySummary?: Record<string, unknown>;
  movementAssessment?: MovementAssessment;
  timeContext?: TimeContext;
  expectedType?: "training_plan" | "plan_patch" | "training_card" | "training_review";
};

function compactText(value: string | undefined, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function compactValue(value: unknown): unknown {
  if (typeof value === "string") return compactText(value, 140);
  if (Array.isArray(value)) return value.slice(0, 4).map(compactValue);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 8)
        .map(([key, entry]) => [key, compactValue(entry)])
        .filter(([, entry]) => entry !== undefined)
    );
  }
  return value;
}

function compactList(values: unknown[] | undefined, maxItems: number): unknown[] {
  return Array.isArray(values) ? values.slice(0, maxItems) : [];
}

function compactTrainingCard(card: TrainingCard): TrainingCard {
  return {
    date: card.date,
    date_label: card.date_label,
    timezone: card.timezone,
    location: card.location,
    duration: card.duration,
    theme: compactText(card.theme, 120) || card.theme,
    planned: compactList(card.planned, 4).map(compactValue),
    actual_completed: compactList(card.actual_completed, 6).map(compactValue),
    adjustments: compactList(card.adjustments, 3).map(compactValue),
    equipment_notes: compactList(card.equipment_notes, 2).map(compactValue),
    body_feedback: compactList(card.body_feedback, 3).map(compactValue),
    fatigue_notes: compactList(card.fatigue_notes, 3).map(compactValue),
    pain_or_discomfort: compactList(card.pain_or_discomfort, 3).map(compactValue),
    unfinished_items: compactList(card.unfinished_items, 3).map(compactValue),
    next_session_suggestions: Array.isArray(card.next_session_suggestions)
      ? card.next_session_suggestions.slice(0, 3).map((item) => compactText(item, 140) || item)
      : []
  };
}

function compactTrainingCardForPlanning(card: TrainingCard): TrainingCard {
  return {
    date: card.date,
    date_label: card.date_label,
    timezone: card.timezone,
    location: card.location,
    duration: card.duration,
    theme: compactText(card.theme, 100) || card.theme,
    planned: [],
    actual_completed: compactList(card.actual_completed, 4).map(compactValue),
    adjustments: [],
    equipment_notes: compactList(card.equipment_notes, 2).map(compactValue),
    body_feedback: compactList(card.body_feedback, 2).map(compactValue),
    fatigue_notes: compactList(card.fatigue_notes, 2).map(compactValue),
    pain_or_discomfort: compactList(card.pain_or_discomfort, 2).map(compactValue),
    unfinished_items: compactList(card.unfinished_items, 2).map(compactValue),
    next_session_suggestions: Array.isArray(card.next_session_suggestions)
      ? card.next_session_suggestions.slice(0, 2).map((item) => compactText(item, 120) || item)
      : []
  };
}

function isPlanItem(item: PlanItem | string): item is PlanItem {
  return typeof item === "object" && item !== null && "exercise" in item;
}

function compactPlanItem(item: PlanItem | string): PlanItem | string {
  if (!isPlanItem(item)) return compactText(String(item), 160) || String(item);
  return {
    exercise: item.exercise,
    role: item.role,
    movement_pattern: item.movement_pattern,
    primary_muscles: Array.isArray(item.primary_muscles) ? item.primary_muscles.slice(0, 4) : undefined,
    sets: item.sets,
    reps: compactText(item.reps, 120) || item.reps,
    intensity: item.intensity,
    rest: item.rest,
    cue: compactText(item.cue, 180) || item.cue,
    selection_reason: compactText(item.selection_reason, 160),
    adjustment_rule: compactText(item.adjustment_rule, 160),
    substitutions: Array.isArray(item.substitutions) ? item.substitutions.slice(0, 3) : []
  };
}

function compactPlanCard(plan: PlanCard): PlanCard {
  return {
    title: plan.title,
    target_date: plan.target_date,
    date_label: plan.date_label,
    timezone: plan.timezone,
    duration: plan.duration,
    goal: compactText(plan.goal, 220) || plan.goal,
    sections: (Array.isArray(plan.sections) ? plan.sections : []).slice(0, 5).map((section) => ({
      name: section.name,
      items: (Array.isArray(section.items) ? section.items : []).slice(0, 6).map(compactPlanItem)
    })),
    risk_notes: Array.isArray(plan.risk_notes) ? plan.risk_notes.slice(0, 4).map((item) => compactText(item, 160) || item) : [],
    reasoning: compactText(plan.reasoning, 260) || plan.reasoning,
    framework_trace: Array.isArray(plan.framework_trace) ? plan.framework_trace.slice(0, 3).map((item) => compactText(item, 160) || item) : undefined,
    decision_basis: Array.isArray(plan.decision_basis) ? plan.decision_basis.slice(0, 4).map((item) => compactText(item, 160) || item) : undefined,
    recent_training_summary: Array.isArray(plan.recent_training_summary) ? plan.recent_training_summary.slice(0, 4) : undefined,
    quality_warnings: Array.isArray(plan.quality_warnings) ? plan.quality_warnings.slice(0, 4) : undefined
  };
}

function compactCurrentSession(
  session: CurrentSession,
  expectedType?: BuildHermesMessageInput["expectedType"]
): CurrentSession {
  const includePlan = expectedType !== "training_plan" && session.plan_card;
  return {
    id: session.id,
    created_at: session.created_at,
    started_at: session.started_at,
    updated_at: session.updated_at,
    timezone: session.timezone,
    session_date: session.session_date,
    target_date: session.target_date,
    target_date_label: session.target_date_label,
    theme: compactText(session.theme, 140),
    goal: compactText(session.goal, 220),
    location: session.location,
    phase: session.phase,
    current_exercise: session.current_exercise,
    current_set: session.current_set,
    progress: compactText(session.progress, 160),
    plan_card: includePlan ? compactPlanCard(session.plan_card as PlanCard) : undefined,
    events: Array.isArray(session.events) ? session.events.slice(-6).map(compactValue) : []
  };
}

function compactMemorySummary(memory: Record<string, unknown>): Record<string, unknown> {
  return {
    user_goal: memory.user_goal,
    preferences: Array.isArray(memory.preferences) ? memory.preferences.slice(0, 6) : [],
    locations: Array.isArray(memory.locations) ? memory.locations.slice(0, 4) : [],
    equipment: Array.isArray(memory.equipment) ? memory.equipment.slice(0, 8) : [],
    risks: Array.isArray(memory.risks) ? memory.risks.slice(0, 6) : [],
    observations: Array.isArray(memory.observations) ? memory.observations.slice(0, 6).map(compactValue) : [],
    confirmed_updates: Array.isArray(memory.confirmed_updates)
      ? memory.confirmed_updates.slice(-6).map((item) => {
          if (typeof item !== "object" || item === null) return compactValue(item);
          const update = item as Record<string, unknown>;
          return {
            content: compactText(typeof update.content === "string" ? update.content : undefined, 180),
            category: update.category,
            key: update.key,
            value: update.value
          };
        })
      : [],
    pending_updates: Array.isArray(memory.pending_updates)
      ? memory.pending_updates.slice(0, 3).map(compactValue)
      : []
  };
}

function compactExerciseSelectionContext(context: Record<string, unknown>): Record<string, unknown> {
  const candidateRoles = Array.isArray(context.candidate_roles)
    ? context.candidate_roles.slice(0, 5).map((roleEntry) => {
        if (typeof roleEntry !== "object" || roleEntry === null) return roleEntry;
        const entry = roleEntry as Record<string, unknown>;
        return {
          role: entry.role,
          candidates: Array.isArray(entry.candidates)
            ? entry.candidates.slice(0, 2).map((candidate) => {
                if (typeof candidate !== "object" || candidate === null) return candidate;
                const item = candidate as Record<string, unknown>;
                return {
                  exercise: item.exercise,
                  movement_pattern: item.movement_pattern,
                  primary_muscles: Array.isArray(item.primary_muscles) ? item.primary_muscles.slice(0, 3) : [],
                  selection_reason: compactText(typeof item.selection_reason === "string" ? item.selection_reason : undefined, 140),
                  substitutions: Array.isArray(item.substitutions) ? item.substitutions.slice(0, 2) : []
                };
              })
            : []
        };
      })
    : [];
  return {
    target_focus: context.target_focus,
    target_adaptation: context.target_adaptation,
    readiness: context.readiness,
    movement_priorities: Array.isArray(context.movement_priorities) ? context.movement_priorities.slice(0, 5) : [],
    constraints: Array.isArray(context.constraints) ? context.constraints.slice(0, 5) : [],
    candidate_roles: candidateRoles,
    programming_rules: Array.isArray(context.programming_rules) ? context.programming_rules.slice(0, 4) : []
  };
}

export function buildHermesMessage(input: BuildHermesMessageInput): HermesMessage {
  const skillRoot = path.resolve("road-to-summer/hermes-extension/skills/road_to_summer");
  const timeContext = input.timeContext || buildTimeContext({
    rawText: input.rawText,
    timezone: input.currentSession.timezone,
    targetDate: input.currentSession.target_date
  });
  const currentSession = compactCurrentSession(input.currentSession, input.expectedType);
  const recentTrainingCards = (input.recentTrainingCards || []).slice(0, 3).map((card) =>
    input.expectedType === "training_plan" || input.expectedType === "plan_patch"
      ? compactTrainingCardForPlanning(card)
      : compactTrainingCard(card)
  );
  const recentSummary = recentTrainingCards.map((card) => ({
    date: card.date,
    theme: card.theme,
    body_feedback: card.body_feedback,
    fatigue_notes: card.fatigue_notes,
    unfinished_items: card.unfinished_items
  }));
  const exerciseSelectionContext = buildExerciseSelectionContext({
    rawText: input.rawText,
    currentSession: input.currentSession,
    recentTrainingCards: input.recentTrainingCards || []
  });
  const compactSelectionContext = compactExerciseSelectionContext(exerciseSelectionContext as Record<string, unknown>);
  const memorySummary = compactMemorySummary(input.memorySummary || {});
  return {
    source: input.source,
    raw_text: input.rawText,
    time_context: timeContext,
    current_session: currentSession,
    recent_training_cards: recentTrainingCards,
    memory_summary: memorySummary,
    exercise_selection_context: compactSelectionContext,
    movement_assessment: input.movementAssessment,
    instruction: [
      "Use the Hermes skill named road_to_summer, but answer from the provided HermesMessage first; do not inspect files unless essential.",
      `Skill path if essential: ${skillRoot}.`,
      "Return only valid JSON matching output_contract.md.",
      "All user-facing fields must be Chinese.",
      `Use time_context as the source of truth: today=${timeContext.today}, target_date=${timeContext.target_date}, timezone=${timeContext.timezone}, temporal_intent=${timeContext.temporal_intent}, date_source=${timeContext.date_source}. First compare target_date with today as absolute YYYY-MM-DD dates before deciding whether this is past, present, or future.`,
      "Use absolute dates in saved data, UI-facing date fields, and primary plan/card explanations. Do not write relative date labels such as 今天, 明天, 昨天, or 前天 into plan_card.date_label, training_card.date_label, history cards, Markdown records, or plan/card headline explanations.",
      timeContext.date_conflict
        ? `There is a date conflict: selected_date=${timeContext.date_conflict.selected_date}, resolved_date=${timeContext.date_conflict.resolved_date}; follow ${timeContext.date_conflict.resolution}.`
        : "",
      "Classify the input using time_context: future_training_plan, backfill_training_log, current_session_update, or in_session_adjustment.",
      "For plan_patch, infer natural Chinese feedback directly: 太轻 -> adjust_load up; 太重 -> adjust_load down; 感觉不到 -> update_cue; 不会做 -> update_cue; 加组 -> add_set if safe; 累 -> extend_rest or reduce load; 疼/不舒服 -> risk-safe guidance; 器械占用/坏了 -> replace_exercise.",
      "Never return the generic taxonomy prompt 请确认这是器械、疲劳、疼痛、动作感受，还是训练结束.",
      "Resolve relative or explicit user text from time_context, then operate on the resolved absolute target_date. For backfilled sessions, training_card.date must be time_context.target_date. For future planning, generate a plan for time_context.target_date and do not write a completed training card.",
      "Do not invent weekdays or relative labels. Use only absolute dates unless a weekday is explicitly provided by the user.",
      `Recent training summary for plan decisions: ${JSON.stringify(recentSummary)}.`,
      "For training_plan use exercise_selection_context: target -> target adaptation -> movement pattern -> candidates -> constraints -> role -> variables.",
      "Use ACE IFT, NASM OPT, NSCA Program Design, ACSM 2026 Resistance Training, and RPE/RIR Autoregulation as concise framework_trace decisions.",
      "Every structured PlanItem should include role, movement_pattern, primary_muscles, selection_reason, source_note, common_mistakes, adjustment_rule, substitutions, sets, reps, intensity, rest, and cue when possible. official_source_trace is optional when it fits compactly.",
      "Check the last 1-3 cards. Avoid high-volume repeat work for muscle groups trained in the last 48-72 hours.",
      "Do not duplicate the same exercise in the final plan.",
      "training_plan.reasoning should state recent sessions and constraints driving the decision.",
      "When useful, mention the resolved absolute date in chat_message so the user can catch date mistakes.",
      input.expectedType ? `Return strict ${input.expectedType} JSON.` : "Return strict JSON.",
      "Do not return long natural-language-only answers."
    ].join(" ")
  };
}
