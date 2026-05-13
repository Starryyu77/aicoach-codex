import type { CurrentSession, HermesOutput, TrainingCard } from "../hermes/types.ts";

export type UiStatePatch = {
  current_session?: CurrentSession;
  current_plan?: unknown;
  chat_message: string;
  quick_actions?: string[];
  training_card?: TrainingCard;
  memory_updates?: unknown[];
};

export function mapAgentOutputToUi(output: HermesOutput, currentSession: CurrentSession): UiStatePatch {
  if (output.type === "training_plan") {
    return {
      chat_message: output.chat_message,
      current_plan: output.plan_card,
      quick_actions: output.quick_actions,
      current_session: {
        ...currentSession,
        phase: "warmup",
        theme: output.plan_card.title,
        goal: output.plan_card.goal,
        current_exercise: output.plan_card.sections[0]?.items[0]?.exercise,
        current_set: 1,
        plan_card: output.plan_card
      }
    };
  }

  if (output.type === "plan_patch") {
    return {
      chat_message: output.chat_message,
      quick_actions: output.quick_actions,
      memory_updates: output.memory_updates,
      current_session: {
        ...currentSession,
        events: [...(currentSession.events || []), output.patch]
      }
    };
  }

  return {
    chat_message: output.chat_message,
    training_card: output.training_card,
    memory_updates: output.memory_updates,
    current_session: {
      ...currentSession,
      phase: "ended"
    }
  };
}

