import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProviderConfig } from "../providers/types.ts";
import { PROVIDER_PRESETS } from "../providers/presets.ts";
import { defaultRuntimeRoot } from "./secrets.ts";

export function configFilePath(runtimeRoot = defaultRuntimeRoot()) {
  return path.join(runtimeRoot, "config.json");
}

export function defaultProviderConfig(): ProviderConfig {
  return {
    providers: {
      hermes: {
        active: "local-hermes",
        instances: [
          {
            ...PROVIDER_PRESETS.hermes[0]
          }
        ]
      },
      asr: {
        active: "mock-asr",
        instances: [
          {
            id: "mock-asr",
            type: "mock",
            label: "Mock ASR",
            timeoutMs: 10000
          },
          {
            ...PROVIDER_PRESETS.asr[0]
          },
          {
            ...PROVIDER_PRESETS.asr[2]
          }
        ]
      },
      vision: {
        active: "mock-vision",
        instances: [
          {
            id: "mock-vision",
            type: "mock",
            label: "Mock Vision",
            timeoutMs: 10000
          },
          {
            ...PROVIDER_PRESETS.vision[0]
          }
        ]
      }
    }
  };
}

export async function loadConfig(runtimeRoot = defaultRuntimeRoot()): Promise<ProviderConfig> {
  const filePath = configFilePath(runtimeRoot);
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as ProviderConfig;
    return mergeWithDefaults(parsed);
  } catch {
    const config = defaultProviderConfig();
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    return config;
  }
}

function mergeWithDefaults(config: ProviderConfig): ProviderConfig {
  const defaults = defaultProviderConfig();
  return {
    providers: {
      hermes: config.providers?.hermes || defaults.providers.hermes,
      asr: config.providers?.asr || defaults.providers.asr,
      vision: config.providers?.vision || defaults.providers.vision
    }
  };
}
