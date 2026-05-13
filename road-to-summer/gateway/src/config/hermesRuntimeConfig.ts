import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultRuntimeRoot, getSecret, setSecret } from "./secrets.ts";

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
};

export type PublicHermesRuntimeConfig = HermesRuntimeConfig & {
  hasApiKey: boolean;
};

export type HermesRuntimeUpdateRequest = Partial<HermesRuntimeConfig> & {
  apiKey?: string;
};

export const HERMES_RUNTIME_PRESETS: HermesRuntimePreset[] = [
  {
    id: "minimax-global",
    label: "MiniMax for Hermes",
    description: "Configure Hermes runtime to use MiniMax as its model provider. Gateway still calls Hermes through the API Server.",
    provider: "minimax",
    model: "MiniMax-M2.7",
    baseUrl: "https://api.minimax.io/anthropic",
    apiKeyRef: "MINIMAX_API_KEY",
    env: {
      HERMES_INFERENCE_PROVIDER: "minimax",
      HERMES_INFERENCE_MODEL: "MiniMax-M2.7",
      MINIMAX_BASE_URL: "https://api.minimax.io/anthropic"
    },
    secretLabel: "MiniMax API Key",
    secretPlaceholder: "sk-..."
  },
  {
    id: "minimax-cn",
    label: "MiniMax CN for Hermes",
    description: "Configure Hermes runtime for MiniMax China endpoint when that key and endpoint are used.",
    provider: "minimax",
    model: "MiniMax-M2.7",
    baseUrl: "https://api.minimaxi.com/anthropic",
    apiKeyRef: "MINIMAX_CN_API_KEY",
    env: {
      HERMES_INFERENCE_PROVIDER: "minimax",
      HERMES_INFERENCE_MODEL: "MiniMax-M2.7",
      MINIMAX_CN_BASE_URL: "https://api.minimaxi.com/anthropic"
    },
    secretLabel: "MiniMax CN API Key",
    secretPlaceholder: "sk-..."
  }
];

export function hermesRuntimeConfigPath(runtimeRoot = defaultRuntimeRoot()) {
  return path.join(runtimeRoot, "hermes-runtime.json");
}

export function defaultHermesRuntimeConfig(): HermesRuntimeConfig {
  return {
    activePresetId: "",
    provider: "",
    model: "",
    baseUrl: "",
    apiKeyRef: "",
    env: {}
  };
}

export async function loadHermesRuntimeConfig(runtimeRoot = defaultRuntimeRoot()): Promise<HermesRuntimeConfig> {
  const filePath = hermesRuntimeConfigPath(runtimeRoot);
  try {
    return {
      ...defaultHermesRuntimeConfig(),
      ...(JSON.parse(await readFile(filePath, "utf8")) as HermesRuntimeConfig)
    };
  } catch {
    const config = defaultHermesRuntimeConfig();
    await saveHermesRuntimeConfig(config, runtimeRoot);
    return config;
  }
}

export async function saveHermesRuntimeConfig(config: HermesRuntimeConfig, runtimeRoot = defaultRuntimeRoot()) {
  const filePath = hermesRuntimeConfigPath(runtimeRoot);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return config;
}

export async function getPublicHermesRuntimeConfig(runtimeRoot = defaultRuntimeRoot()): Promise<PublicHermesRuntimeConfig> {
  const config = await loadHermesRuntimeConfig(runtimeRoot);
  return {
    ...config,
    hasApiKey: Boolean(await getSecret(config.apiKeyRef, runtimeRoot))
  };
}

export async function updateHermesRuntimeConfig(request: HermesRuntimeUpdateRequest, runtimeRoot = defaultRuntimeRoot()) {
  const preset = request.activePresetId
    ? HERMES_RUNTIME_PRESETS.find((item) => item.id === request.activePresetId)
    : undefined;
  const base = preset
    ? {
        activePresetId: preset.id,
        provider: preset.provider,
        model: preset.model,
        baseUrl: preset.baseUrl,
        apiKeyRef: preset.apiKeyRef,
        env: preset.env
      }
    : await loadHermesRuntimeConfig(runtimeRoot);
  const config: HermesRuntimeConfig = {
    ...base,
    ...Object.fromEntries(Object.entries(request).filter(([key]) => key !== "apiKey")) as Partial<HermesRuntimeConfig>,
    env: {
      ...base.env,
      ...(request.env || {})
    }
  };

  if (request.apiKey && config.apiKeyRef) {
    await setSecret(config.apiKeyRef, request.apiKey, runtimeRoot);
  }
  for (const [key, value] of Object.entries(config.env)) {
    if (key.endsWith("_KEY")) continue;
    if (value) await setSecret(key, value, runtimeRoot);
  }
  return saveHermesRuntimeConfig(config, runtimeRoot);
}
