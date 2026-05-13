export type PlanItem = {
  exercise: string;
  sets: string;
  reps: string;
  intensity: string;
  rest: string;
  cue: string;
  substitutions: string[];
};

export type PlanSection = {
  name: string;
  items: PlanItem[];
};

export type PlanCard = {
  title: string;
  duration: string;
  goal: string;
  sections: PlanSection[];
  risk_notes: string[];
  reasoning: string;
};

export type TrainingCard = {
  id?: string;
  date: string;
  location: string;
  duration: string;
  theme: string;
  planned: unknown[];
  actual_completed: unknown[];
  adjustments: unknown[];
  equipment_notes: unknown[];
  body_feedback: unknown[];
  fatigue_notes: unknown[];
  pain_or_discomfort: unknown[];
  unfinished_items: unknown[];
  next_session_suggestions: string[];
};

export type UiResponse = {
  hermes_output: unknown;
  ui: {
    chat_message: string;
    current_plan?: PlanCard;
    current_session?: {
      theme?: string;
      goal?: string;
      progress?: string;
      current_exercise?: string;
      current_set?: number;
      plan_card?: PlanCard;
    };
    quick_actions?: string[];
    training_card?: TrainingCard;
    memory_updates?: unknown[];
  };
};

