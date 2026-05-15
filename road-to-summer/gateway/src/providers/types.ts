import type { HermesMessage, HermesResponse, MovementAssessment } from "../hermes/types.ts";

export type ProviderCategory = "hermes" | "asr" | "vision";

export type HermesProviderType = "mock" | "hermes-api-server" | "openai-compatible-hermes" | "anthropic-compatible-hermes";
export type AsrProviderType = "mock" | "openai-whisper" | "doubao-asr" | "groq-whisper" | "local-whisper";
export type VisionProviderType = "mock" | "external-pose-http";

export type ProviderInstance = {
  id: string;
  type: HermesProviderType | AsrProviderType | VisionProviderType;
  label: string;
  description?: string;
  baseUrl?: string;
  model?: string;
  apiKeyRef?: string;
  timeoutMs?: number;
  endpointMode?: "chat_completions" | "responses";
  extra?: Record<string, unknown>;
  secretLabel?: string;
  secretPlaceholder?: string;
};

export type ProviderConfig = {
  providers: {
    hermes: {
      active: string;
      instances: ProviderInstance[];
    };
    asr: {
      active: string;
      instances: ProviderInstance[];
    };
    vision: {
      active: string;
      instances: ProviderInstance[];
    };
  };
};

export type PublicProviderInstance = Omit<ProviderInstance, "apiKeyRef"> & {
  apiKeyRef?: string;
  hasApiKey: boolean;
};

export type PublicProviderConfig = {
  providers: Record<ProviderCategory, {
    active: string;
    instances: PublicProviderInstance[];
  }>;
};

export type ProviderTestResult = {
  ok: boolean;
  providerId: string;
  providerType: string;
  message: string;
  details?: unknown;
};

export interface HermesProvider {
  readonly instance: ProviderInstance;
  sendMessage(input: HermesMessage): Promise<HermesResponse>;
  test(): Promise<ProviderTestResult>;
}

export type TranscribeAudioInput = {
  audio?: string;
  audioUrl?: string;
  fileName?: string;
  mimeType?: string;
  provider?: string;
};

export type TranscribeAudioOutput = {
  text: string;
  confidence?: number;
  provider: string;
  durationMs?: number;
  raw?: unknown;
};

export interface AsrProvider {
  readonly instance: ProviderInstance;
  transcribe(input: TranscribeAudioInput): Promise<TranscribeAudioOutput>;
  test(): Promise<ProviderTestResult>;
}

export type VisionAssessInput = {
  exercise: string;
  media?: string;
  provider?: string;
};

export interface VisionProvider {
  readonly instance: ProviderInstance;
  assess(input: VisionAssessInput): Promise<MovementAssessment>;
  test(): Promise<ProviderTestResult>;
}
