import { readFile } from "node:fs/promises";
import path from "node:path";

export const MEMORY_FILES = [
  "user_profile.md",
  "training_rules.md",
  "equipment_memory.md",
  "location_memory.md",
  "training_logs.md",
  "preference_memory.md",
  "risk_memory.md",
  "exercise_cues.md",
  "observation_memory.md"
];

export async function loadMemory(rootDir = process.cwd()) {
  const memoryDir = path.join(rootDir, "memory");
  const entries = {};
  for (const file of MEMORY_FILES) {
    try {
      entries[file] = await readFile(path.join(memoryDir, file), "utf8");
    } catch {
      entries[file] = "";
    }
  }
  return entries;
}

export function recentTrainingLogSections(trainingLogs = "", count = 3) {
  const sections = trainingLogs.split(/\n##\s+/).filter(Boolean);
  return sections.slice(-count).map((section) => section.trim());
}

