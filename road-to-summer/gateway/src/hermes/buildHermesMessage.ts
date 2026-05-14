import { buildTimeContext } from "../time/timeContext.ts";
import { buildExerciseSelectionContext } from "../training/exerciseSelection.ts";
import type { CurrentSession, HermesMessage, InputSource, MovementAssessment, TimeContext, TrainingCard } from "./types.ts";
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

export function buildHermesMessage(input: BuildHermesMessageInput): HermesMessage {
  const skillRoot = path.resolve("road-to-summer/hermes-extension/skills/road_to_summer");
  const timeContext = input.timeContext || buildTimeContext({
    rawText: input.rawText,
    timezone: input.currentSession.timezone,
    targetDate: input.currentSession.target_date
  });
  const recentSummary = (input.recentTrainingCards || []).slice(0, 5).map((card) => ({
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
  return {
    source: input.source,
    raw_text: input.rawText,
    time_context: timeContext,
    current_session: input.currentSession,
    recent_training_cards: input.recentTrainingCards || [],
    memory_summary: input.memorySummary || {},
    exercise_selection_context: exerciseSelectionContext,
    movement_assessment: input.movementAssessment,
    instruction: [
      "Use the Hermes skill named road_to_summer.",
      `If you need to inspect local skill files, use this absolute skill path: ${skillRoot}.`,
      "Respect output_contract.md.",
      "All user-facing fields must be in Chinese: chat_message, reasoning, source_note, framework_trace, official_source_trace text fields, cues, selection_reason, adjustment_rule, risk_notes, and quick explanations.",
      `Use time_context as the source of truth: today=${timeContext.today}, target_date=${timeContext.target_date}, timezone=${timeContext.timezone}, temporal_intent=${timeContext.temporal_intent}, date_source=${timeContext.date_source}.`,
      timeContext.date_conflict
        ? `There is a date conflict: selected_date=${timeContext.date_conflict.selected_date}, resolved_date=${timeContext.date_conflict.resolved_date}; follow ${timeContext.date_conflict.resolution}.`
        : "",
      "First classify the input as future_training_plan, backfill_training_log, current_session_update, or in_session_adjustment using time_context.",
      "When current_session has a current_exercise and expectedType is plan_patch, treat ordinary natural-language training feedback as in-session coaching input. Do not ask the user to classify whether it is equipment, fatigue, pain, action feeling, or session end unless the safety meaning is genuinely ambiguous.",
      "For in-session feedback, infer the likely intent directly: 太轻/太轻松 -> adjust_load upward; 太重/做不动/姿势变形 -> adjust_load downward or reduce_sets; 感觉不到目标肌肉 -> update_cue; 不会做/怎么做 -> update_cue with plain-language instructions; 要不要加组/还能继续吗 -> add_set only if movement quality and risk allow; 有点累 -> extend_rest or reduce load after checking fatigue type; 有点疼/不舒服 -> risk-safe update_cue or end_session for red flags; 器械有人/坏了 -> replace_exercise.",
      "For plan_patch chat_message, answer like a coach in Chinese. Start from the user's exact feedback and current exercise, then give the next concrete instruction. Never return a generic taxonomy prompt like '请确认这是器械、疲劳、疼痛、动作感受，还是训练结束'.",
      "Resolve relative and explicit dates from time_context. User-stated dates override stale frontend selected dates. For backfilled sessions, training_card.date must be time_context.target_date. For future planning, generate a plan for time_context.target_date and do not write a completed training card.",
      `Recent training summary for plan decisions: ${JSON.stringify(recentSummary)}.`,
      `Exercise selection context: ${JSON.stringify(exerciseSelectionContext)}.`,
      "Use the five-framework bridge: ACE IFT for client context and adherence, NASM OPT for phase/progression, NSCA Program Design for session structure and total load, ACSM 2026 Resistance Training for outcome-to-variable mapping, and RPE/RIR Autoregulation for real-time adjustment rules.",
      "For training_plan, do not invent a random exercise list. Use this decision chain: target -> target adaptation -> movement pattern -> candidate pool -> individual constraints -> exercise role -> training variables.",
      "Every structured PlanItem should include role, movement_pattern, primary_muscles, selection_reason, source_note, common_mistakes, adjustment_rule, substitutions, sets, reps, intensity, rest, and cue when possible.",
      "For training_plan, include plan_card.framework_trace with 3-5 concise entries naming the framework decisions that actually shaped this plan.",
      "For training_plan, include plan_card.official_source_trace for machine traceability, but do not write it like a separate reference table. Also put the practical source explanation into each exercise's Chinese source_note, as a coach would say it during training.",
      "Before returning a training_plan, check the last 1-3 training cards. Do not assign a high-volume main session to muscle groups trained in the last 48-72 hours. If recent upper-body shoulder/back work and recent high-intensity lower-body work both exist, prefer recovery, mobility, core control, and low-intensity cardio.",
      "Do not duplicate the same exercise in the final plan. Warm-up ramp sets are allowed only when clearly marked as ramp-up and not counted as another working exercise.",
      "training_plan.reasoning must explicitly say which recent sessions and constraints drove the decision. Include decision_basis, recent_training_summary, and quality_warnings when useful.",
      "When useful, mention the resolved absolute date in chat_message so the user can catch date mistakes.",
      input.expectedType ? `Return strict ${input.expectedType} JSON.` : "Return strict JSON.",
      "Do not return long natural-language-only answers."
    ].join(" ")
  };
}
