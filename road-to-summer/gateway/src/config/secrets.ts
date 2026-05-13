import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export function defaultRuntimeRoot() {
  return path.resolve(".runtime");
}

export function secretsFilePath(runtimeRoot = defaultRuntimeRoot()) {
  return path.join(runtimeRoot, "secrets.env");
}

function parseEnv(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    values[key] = value.replace(/^["']|["']$/g, "");
  }
  return values;
}

function serializeEnv(values: Record<string, string>) {
  return Object.entries(values)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n") + "\n";
}

export async function loadSecretMap(runtimeRoot = defaultRuntimeRoot()): Promise<Record<string, string>> {
  const filePath = secretsFilePath(runtimeRoot);
  const fileValues = await readFile(filePath, "utf8").then(parseEnv).catch(() => ({}));
  return { ...fileValues, ...process.env } as Record<string, string>;
}

export async function getSecret(ref?: string, runtimeRoot = defaultRuntimeRoot()): Promise<string | undefined> {
  if (!ref) return undefined;
  const values = await loadSecretMap(runtimeRoot);
  return values[ref];
}

export async function setSecret(ref: string, value: string, runtimeRoot = defaultRuntimeRoot()) {
  const filePath = secretsFilePath(runtimeRoot);
  await mkdir(path.dirname(filePath), { recursive: true });
  const current = await readFile(filePath, "utf8").then(parseEnv).catch(() => ({}));
  current[ref] = value;
  await writeFile(filePath, serializeEnv(current), "utf8");
}
