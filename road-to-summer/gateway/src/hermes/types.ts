export type InputSource = "text" | "voice" | "camera" | "quick_action" | "vision" | "system";

export type TimeContext = {
  timezone: string;
  now_iso: string;
  today: string;
  target_date: string;
  target_date_label: string;
  target_offset_days: number;
  temporal_intent:
    | "today_session"
    | "future_planning"
    | "backfill_training_log"
    | "past_reference"
    | "selected_date"
    | "unspecified";
  date_source: "explicit_text" | "relative_text" | "selected_date" | "default_today";
  date_conflict?: {
    selected_date: string;
    resolved_date: string;
    resolution: "explicit_text_wins" | "relative_text_wins";
  };
  mentioned_terms: string[];
};

export type CurrentSession = {
  id?: string;
  created_at?: string;
  started_at?: string;
  updated_at?: string;
  timezone?: string;
  session_date?: string;
  target_date?: string;
  target_date_label?: string;
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
  time_context: TimeContext;
  current_session: CurrentSession;
  recent_training_cards?: TrainingCard[];
  memory_summary?: Record<string, unknown>;
  exercise_selection_context?: Record<string, unknown>;
  movement_assessment?: MovementAssessment;
  instruction: string;
};

export type MemoryUpdate = {
  target: "Hermes Memory";
  content: string;
  reason: string;
  requires_confirmation: boolean;
  category?: "preference" | "equipment" | "location" | "risk" | "observation" | "training";
  operation?: "add" | "remove" | "replace";
  key?: string;
  value?: string;
  remove_values?: string[];
};

export type PlanItem = {
  exercise: string;
  role?: string;
  movement_pattern?: string;
  primary_muscles?: string[];
  selection_reason?: string;
  source_note?: string;
  common_mistakes?: string[];
  adjustment_rule?: string;
  sets: string;
  reps: string;
  intensity: string;
  rest: string;
  cue: string;
  substitutions: string[];
};

export type PlanSection = {
  name: string;
  items: Array<PlanItem | string>;
};

export type PlanCard = {
  title: string;
  target_date?: string;
  date_label?: string;
  timezone?: string;
  duration: string;
  goal: string;
  sections: PlanSection[];
  risk_notes: string[];
  reasoning: string;
  framework_trace?: string[];
  official_source_trace?: OfficialSourceTrace[];
  decision_basis?: string[];
  recent_training_summary?: string[];
  quality_warnings?: string[];
};

export type OfficialSourceTrace = {
  framework: string;
  model: string;
  official_source: string;
  source_url: string;
  source_location: string;
  principle: string;
  applied_decision: string;
  why_it_matters: string;
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
  session_update?: Partial<CurrentSession>;
};

export type TrainingCard = {
  id?: string;
  storage_path?: string;
  markdown_path?: string;
  markdown?: string;
  date: string;
  timezone?: string;
  date_label?: string;
  completed_at?: string;
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

export type TrainingReviewOutput = {
  type: "training_review";
  chat_message: string;
  review_card: {
    title: string;
    date_range: {
      from?: string;
      to?: string;
      label: string;
    };
    scope: "single_day" | "multi_day" | "recent_series";
    referenced_cards: string[];
    sessions: Array<{
      date: string;
      theme: string;
      summary: string;
      highlights: string[];
      issues: string[];
    }>;
    patterns: string[];
    risks: string[];
    next_actions: string[];
  };
  quick_actions?: string[];
};

export type HermesOutput = TrainingPlanOutput | PlanPatchOutput | TrainingCardOutput | TrainingReviewOutput;

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
