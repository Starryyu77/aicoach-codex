import { ensureStateDirs, getStorePaths, readJson, writeJson } from "./fileStore.ts";

export type MockMemory = {
  user_goal: string;
  preferences: string[];
  locations: string[];
  equipment: string[];
  risks: string[];
  observations: string[];
  pending_updates: Array<{
    id: string;
    target: string;
    content: string;
    reason: string;
    requires_confirmation: boolean;
  }>;
  confirmed_updates: Array<{
    id: string;
    target: string;
    content: string;
    reason: string;
  }>;
};

const DEFAULT_MEMORY: MockMemory = {
  user_goal: "增肌塑形 + 功能性维护",
  preferences: ["不喜欢波比跳", "不喜欢高强度 HIIT；如确有价值需先解释"],
  locations: ["公寓健身房空间较小"],
  equipment: ["哑铃", "卧推凳", "高位下拉", "绳索", "划船机"],
  risks: ["肩前侧偶尔紧"],
  observations: [],
  pending_updates: [],
  confirmed_updates: []
};

export async function getMockMemory(stateRoot?: string): Promise<MockMemory> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  return readJson<MockMemory>(paths.memoryFile, structuredClone(DEFAULT_MEMORY));
}

export async function saveMockMemory(memory: MockMemory, stateRoot?: string): Promise<MockMemory> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  await writeJson(paths.memoryFile, memory);
  return memory;
}

export async function addPendingMemoryUpdates(updates: any[] = [], stateRoot?: string): Promise<MockMemory> {
  const memory = await getMockMemory(stateRoot);
  const normalized = updates.map((update) => ({
    id: `mem-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    target: update.target || "Hermes Memory",
    content: update.content || "",
    reason: update.reason || "",
    requires_confirmation: update.requires_confirmation !== false
  }));
  memory.pending_updates.push(...normalized);
  return saveMockMemory(memory, stateRoot);
}

export async function confirmMemoryUpdate(id: string, stateRoot?: string): Promise<MockMemory> {
  const memory = await getMockMemory(stateRoot);
  const index = memory.pending_updates.findIndex((item) => item.id === id);
  if (index >= 0) {
    const [update] = memory.pending_updates.splice(index, 1);
    memory.confirmed_updates.push({
      id: update.id,
      target: update.target,
      content: update.content,
      reason: update.reason
    });
  }
  return saveMockMemory(memory, stateRoot);
}
