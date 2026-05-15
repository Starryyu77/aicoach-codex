import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export function defaultRuntimeRoot() {
  return path.resolve(".runtime");
}

export function secretsFilePath(runtimeRoot = defaultRuntimeRoot()) {
  return path.join(runtimeRoot, "secrets.env");
}

const SECRET_REF_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;

export function sanitizeSecretRef(ref?: string): string {
  const trimmed = (ref || "").trim();
  if (!trimmed) return "";
  if (!SECRET_REF_PATTERN.test(trimmed)) {
    throw new Error("Invalid secret ref. Use uppercase env-style names like OPENAI_API_KEY.");
  }
  return trimmed;
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
  const fileValues = await readFile(filePath, "utf8").then(parseEnv).catch((): Record<string, string> => ({}));
  return { ...fileValues, ...process.env } as Record<string, string>;
}

export async function getSecret(ref?: string, runtimeRoot = defaultRuntimeRoot()): Promise<string | undefined> {
  const safeRef = sanitizeSecretRef(ref);
  if (!safeRef) return undefined;
  const values = await loadSecretMap(runtimeRoot);
  return values[safeRef];
}

export async function setSecret(ref: string, value: string, runtimeRoot = defaultRuntimeRoot()) {
  const safeRef = sanitizeSecretRef(ref);
  if (!safeRef) throw new Error("Secret ref is required.");
  const filePath = secretsFilePath(runtimeRoot);
  await mkdir(path.dirname(filePath), { recursive: true });
  const current = await readFile(filePath, "utf8").then(parseEnv).catch((): Record<string, string> => ({}));
  current[safeRef] = value;
  await writeFile(filePath, serializeEnv(current), "utf8");
}
