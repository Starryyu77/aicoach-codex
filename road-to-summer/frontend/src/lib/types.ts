export type PlanItem = {
  item_id?: string;
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
  section_id?: string;
  name: string;
  items: Array<PlanItem | string>;
};

export type PlanCard = {
  plan_id?: string;
  plan_revision?: number;
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

export type AgentUiComponentType =
  | "surface"
  | "section"
  | "coach_message"
  | "plan_summary"
  | "plan_sections"
  | "current_exercise"
  | "patch_card"
  | "training_card"
  | "memory_updates"
  | "action_row";

export type AgentUiComponent = {
  id: string;
  type: AgentUiComponentType;
  props?: Record<string, unknown>;
  children?: string[];
};

export type AgentUiDocument = {
  version: "rts-a2ui-0.1";
  surface: "training_cockpit" | "history" | "memory";
  root: string;
  components: AgentUiComponent[];
  data: {
    chat_message: string;
    plan?: PlanCard;
    session?: SessionSnapshot;
    patch?: {
      operation: string;
      target_exercise: string;
      target_item_id?: string;
      target_section_id?: string;
      applies_to_plan_id?: string;
      applies_to_revision?: number;
      from?: string;
      to?: string;
      reason: string;
      next_instruction: string;
    };
    training_card?: TrainingCard;
    memory_updates?: unknown[];
    quick_actions?: string[];
  };
};

export type UiResponse = {
  hermes_output: unknown;
  ui: {
    chat_message: string;
    current_plan?: PlanCard;
    current_session?: {
      theme?: string;
      goal?: string;
      timezone?: string;
      session_date?: string;
      target_date?: string;
      target_date_label?: string;
      phase?: string;
      progress?: string;
      plan_id?: string;
      plan_revision?: number;
      current_item_id?: string;
      current_exercise?: string;
      current_set?: number;
      plan_card?: PlanCard;
    };
    quick_actions?: string[];
    training_card?: TrainingCard;
    memory_updates?: unknown[];
    agent_ui?: AgentUiDocument;
  };
};

export type SessionSnapshot = {
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
  phase?: string;
  current_exercise?: string;
  current_item_id?: string;
  current_set?: number;
  plan_id?: string;
  plan_revision?: number;
  progress?: string;
  plan_card?: PlanCard;
  current_plan?: PlanCard | null;
  time_context?: {
    timezone: string;
    now_iso: string;
    today: string;
    target_date: string;
    target_date_label: string;
    target_offset_days: number;
    temporal_intent: string;
    date_source: string;
    date_conflict?: {
      selected_date: string;
      resolved_date: string;
      resolution: string;
    };
    mentioned_terms: string[];
  };
  storage?: {
    state_root: string;
    current_session: string;
    current_plan: string;
    training_cards_dir: string;
  };
};

export type ProviderCategory = "hermes" | "asr" | "vision";

export type ProviderInstance = {
  id: string;
  type: string;
  label: string;
  description?: string;
  baseUrl?: string;
  model?: string;
  apiKeyRef?: string;
  timeoutMs?: number;
  endpointMode?: "chat_completions" | "responses";
  hasApiKey?: boolean;
  extra?: Record<string, unknown>;
  secretLabel?: string;
  secretPlaceholder?: string;
};

export type ProviderPreset = ProviderInstance & {
  description: string;
  secretLabel?: string;
  secretPlaceholder?: string;
};

export type ProviderConfig = {
  providers: Record<ProviderCategory, {
    active: string;
    instances: ProviderInstance[];
  }>;
};

export type ProviderTestResult = {
  ok: boolean;
  providerId: string;
  providerType: string;
  message: string;
  details?: unknown;
};

export type HermesRuntimePreset = {
  id: string;
  label: string;
  description: string;
  provider: string;
  model: string;
  baseUrl?: string;
  apiKeyRef: string;
  env: Record<string, string>;
  secretLabel: string;
  secretPlaceholder: string;
};

export type HermesRuntimeConfig = {
  activePresetId: string;
  provider: string;
  model: string;
  baseUrl?: string;
  apiKeyRef: string;
  env: Record<string, string>;
  hasApiKey: boolean;
};
