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
