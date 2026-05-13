import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProviderConfig } from "../providers/types.ts";
import { configFilePath } from "./loadConfig.ts";
import { defaultRuntimeRoot } from "./secrets.ts";

export async function saveConfig(config: ProviderConfig, runtimeRoot = defaultRuntimeRoot()) {
  const filePath = configFilePath(runtimeRoot);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return config;
}
