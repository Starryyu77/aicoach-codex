import type { CurrentSession, HermesMessage, InputSource, MovementAssessment, TrainingCard } from "./types.ts";

export type BuildHermesMessageInput = {
  source: InputSource;
  rawText: string;
  currentSession: CurrentSession;
  recentTrainingCards?: TrainingCard[];
  memorySummary?: Record<string, unknown>;
  movementAssessment?: MovementAssessment;
  expectedType?: "training_plan" | "plan_patch" | "training_card";
};

export function buildHermesMessage(input: BuildHermesMessageInput): HermesMessage {
  return {
    source: input.source,
    raw_text: input.rawText,
    current_session: input.currentSession,
    recent_training_cards: input.recentTrainingCards || [],
    memory_summary: input.memorySummary || {},
    movement_assessment: input.movementAssessment,
    instruction: [
      "Use the Road to Summer Skill Pack.",
      "Respect output_contract.md.",
      input.expectedType ? `Return strict ${input.expectedType} JSON.` : "Return strict JSON.",
      "Do not return long natural-language-only answers."
    ].join(" ")
  };
}

