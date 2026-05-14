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
  current_set?: number;
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
