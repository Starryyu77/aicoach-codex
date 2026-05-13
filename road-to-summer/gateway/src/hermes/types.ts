export type InputSource = "text" | "voice" | "camera" | "quick_action" | "vision" | "system";

export type CurrentSession = {
  id?: string;
  theme?: string;
  goal?: string;
  location?: string;
  phase?: "preworkout" | "warmup" | "main" | "accessory" | "cooldown" | "ended";
  current_exercise?: string;
  current_set?: number;
  progress?: string;
  plan_card?: PlanCard;
  events?: unknown[];
};

export type HermesMessage = {
  source: InputSource;
  raw_text: string;
  current_session: CurrentSession;
  recent_training_cards?: TrainingCard[];
  memory_summary?: Record<string, unknown>;
  movement_assessment?: MovementAssessment;
  instruction: string;
};

export type MemoryUpdate = {
  target: "Hermes Memory";
  content: string;
  reason: string;
  requires_confirmation: boolean;
};

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

export type TrainingPlanOutput = {
  type: "training_plan";
  chat_message: string;
  plan_card: PlanCard;
  quick_actions: string[];
};

export type PlanPatchOutput = {
  type: "plan_patch";
  chat_message: string;
  patch: {
    operation: "replace_exercise" | "adjust_load" | "reduce_sets" | "add_set" | "extend_rest" | "end_session" | "update_cue";
    target_exercise: string;
    from?: string;
    to?: string;
    reason: string;
    next_instruction: string;
  };
  quick_actions: string[];
  memory_updates?: MemoryUpdate[];
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

export type TrainingCardOutput = {
  type: "training_card";
  chat_message: string;
  training_card: TrainingCard;
  memory_updates: MemoryUpdate[];
};

export type HermesOutput = TrainingPlanOutput | PlanPatchOutput | TrainingCardOutput;

export type HermesResponse = {
  output: HermesOutput | string;
  raw: unknown;
  provider: "mock" | "hermes";
};

export type MovementAssessment = {
  event_type: "movement_assessment";
  exercise: string;
  assessment: {
    shoulder_elevation?: string;
    torso_swing?: string;
    range_of_motion?: string;
    fatigue_signal?: string;
  };
  recommendation_needed: boolean;
};

