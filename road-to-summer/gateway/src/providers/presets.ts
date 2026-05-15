import type { ProviderCategory, ProviderInstance } from "./types.ts";

export type ProviderPreset = ProviderInstance & {
  description: string;
  secretLabel?: string;
  secretPlaceholder?: string;
};

export const PROVIDER_PRESETS: Record<ProviderCategory, ProviderPreset[]> = {
  hermes: [
    {
      id: "local-hermes",
      type: "hermes-api-server",
      label: "Local Hermes API Server",
      description: "Use a local Hermes API Server adapter. Default upstream endpoint is http://127.0.0.1:8642/v1.",
      baseUrl: "http://127.0.0.1:8642/v1",
      model: "hermes-agent",
      apiKeyRef: "HERMES_API_KEY",
      endpointMode: "chat_completions",
      timeoutMs: 30000,
      secretLabel: "Hermes API Server Key",
      secretPlaceholder: "Optional if local Hermes has no API_SERVER_KEY"
    },
    {
      id: "openai-compatible-hermes",
      type: "openai-compatible-hermes",
      label: "OpenAI-compatible Hermes",
      description: "Use a hosted or tunneled OpenAI-compatible Hermes endpoint.",
      baseUrl: "https://your-hermes-host.example/v1",
      model: "hermes-agent",
      apiKeyRef: "HERMES_API_KEY",
      endpointMode: "chat_completions",
      timeoutMs: 30000,
      secretLabel: "Hermes API Key",
      secretPlaceholder: "Bearer token for the hosted Hermes endpoint"
    },
    {
      id: "minimax-cn-hermes",
      type: "anthropic-compatible-hermes",
      label: "MiniMax CN Hermes Direct",
      description: "Call MiniMax's Anthropic-compatible endpoint directly for mobile Hermes JSON responses.",
      baseUrl: "https://api.minimaxi.com/anthropic",
      model: "MiniMax-M2.7-highspeed",
      apiKeyRef: "MINIMAX_CN_API_KEY",
      timeoutMs: 90000,
      extra: {
        maxTokens: 3072
      },
      secretLabel: "MiniMax CN API Key",
      secretPlaceholder: "sk-..."
    }
  ],
  asr: [
    {
      id: "openai-whisper",
      type: "openai-whisper",
      label: "OpenAI Whisper",
      description: "Transcribe browser recordings through OpenAI /audio/transcriptions.",
      baseUrl: "https://api.openai.com/v1",
      model: "whisper-1",
      apiKeyRef: "OPENAI_API_KEY",
      timeoutMs: 30000,
      secretLabel: "OpenAI API Key",
      secretPlaceholder: "sk-..."
    },
    {
      id: "groq-whisper",
      type: "groq-whisper",
      label: "Groq Whisper",
      description: "OpenAI-compatible Whisper endpoint on Groq.",
      baseUrl: "https://api.groq.com/openai/v1",
      model: "whisper-large-v3-turbo",
      apiKeyRef: "GROQ_API_KEY",
      timeoutMs: 30000,
      secretLabel: "Groq API Key",
      secretPlaceholder: "gsk_..."
    },
    {
      id: "doubao-asr-flash",
      type: "doubao-asr",
      label: "Doubao ASR Flash",
      description: "Volcengine Doubao bigmodel flash recognition. New console: paste X-Api-Key. Old console: paste appKey:accessKey.",
      baseUrl: "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash",
      model: "bigmodel",
      apiKeyRef: "DOUBAO_ASR_API_KEY",
      timeoutMs: 60000,
      extra: {
        resourceId: "volc.bigasr.auc_turbo",
        authMode: "auto",
        enable_itn: true,
        enable_punc: true
      },
      secretLabel: "Doubao ASR API Key",
      secretPlaceholder: "New console API key, or old console appKey:accessKey"
    },
    {
      id: "local-whisper",
      type: "local-whisper",
      label: "Local Whisper",
      description: "Placeholder for a local Whisper HTTP endpoint or CLI bridge.",
      baseUrl: "http://127.0.0.1:9000/transcribe",
      model: "local-whisper",
      apiKeyRef: "",
      timeoutMs: 30000
    }
  ],
  vision: [
    {
      id: "external-pose-http",
      type: "external-pose-http",
      label: "External Pose HTTP",
      description: "Call an external pose / movement assessment HTTP service.",
      baseUrl: "http://127.0.0.1:8788/assess",
      apiKeyRef: "POSE_TOOL_API_KEY",
      timeoutMs: 30000,
      secretLabel: "Pose Tool API Key",
      secretPlaceholder: "Optional bearer token"
    }
  ]
};
