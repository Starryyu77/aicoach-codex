import { buildTimeContext } from "../time/timeContext.ts";
import type { CurrentSession, HermesMessage, InputSource, MovementAssessment, TimeContext, TrainingCard } from "./types.ts";

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
  const timeContext = input.timeContext || buildTimeContext({
    rawText: input.rawText,
    timezone: input.currentSession.timezone,
    targetDate: input.currentSession.target_date
  });
  return {
    source: input.source,
    raw_text: input.rawText,
    time_context: timeContext,
    current_session: input.currentSession,
    recent_training_cards: input.recentTrainingCards || [],
    memory_summary: input.memorySummary || {},
    movement_assessment: input.movementAssessment,
    instruction: [
      "Use the Hermes skill named road_to_summer.",
      "The skill files are under road-to-summer/hermes-extension/skills/road_to_summer in this project.",
      "Respect output_contract.md.",
      `Use time_context as the source of truth: today=${timeContext.today}, target_date=${timeContext.target_date}, timezone=${timeContext.timezone}, temporal_intent=${timeContext.temporal_intent}, date_source=${timeContext.date_source}.`,
      timeContext.date_conflict
        ? `There is a date conflict: selected_date=${timeContext.date_conflict.selected_date}, resolved_date=${timeContext.date_conflict.resolved_date}; follow ${timeContext.date_conflict.resolution}.`
        : "",
      "First classify the input as future_training_plan, backfill_training_log, current_session_update, or in_session_adjustment using time_context.",
      "Resolve relative and explicit dates from time_context. User-stated dates override stale frontend selected dates. For backfilled sessions, training_card.date must be time_context.target_date. For future planning, generate a plan for time_context.target_date and do not write a completed training card.",
      "When useful, mention the resolved absolute date in chat_message so the user can catch date mistakes.",
      input.expectedType ? `Return strict ${input.expectedType} JSON.` : "Return strict JSON.",
      "Do not return long natural-language-only answers."
    ].join(" ")
  };
}
