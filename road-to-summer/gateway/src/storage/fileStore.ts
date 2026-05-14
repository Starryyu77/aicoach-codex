import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type StorePaths = {
  stateRoot: string;
  sessionFile: string;
  currentPlanFile: string;
  trainingCardsDir: string;
  memoryFile: string;
  memoryDisplayFile: string;
};

export function getStorePaths(stateRoot = path.resolve("road-to-summer/gateway/state")): StorePaths {
  return {
    stateRoot,
    sessionFile: path.join(stateRoot, "current_session.json"),
    currentPlanFile: path.join(stateRoot, "current_plan.json"),
    trainingCardsDir: path.join(stateRoot, "training_cards"),
    memoryFile: path.join(stateRoot, "mock_memory.json"),
    memoryDisplayFile: path.join(stateRoot, "memory_display.json")
  };
}

export async function ensureStateDirs(paths: StorePaths): Promise<void> {
  await mkdir(paths.stateRoot, { recursive: true });
  await mkdir(paths.trainingCardsDir, { recursive: true });
}

export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function listJsonFiles<T>(dirPath: string): Promise<T[]> {
  try {
    const names = await readdir(dirPath);
    const jsonNames = names.filter((name) => name.endsWith(".json")).sort().reverse();
    const values = await Promise.all(
      jsonNames.map((name) => readJson<T | null>(path.join(dirPath, name), null))
    );
    return values.filter((value): value is T => value !== null);
  } catch {
    return [];
  }
}
