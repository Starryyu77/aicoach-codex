import { ensureStateDirs, getStorePaths, readJson, writeJson } from "./fileStore.ts";

export type MemoryUpdateInput = {
  target?: string;
  content?: string;
  reason?: string;
  requires_confirmation?: boolean;
  category?: "preference" | "equipment" | "location" | "risk" | "observation" | "training";
  operation?: "add" | "remove" | "replace";
  key?: string;
  value?: string;
  remove_values?: string[];
};

export type PendingMemoryUpdate = {
  id: string;
  target: string;
  content: string;
  reason: string;
  requires_confirmation: boolean;
  category?: MemoryUpdateInput["category"];
  operation?: MemoryUpdateInput["operation"];
  key?: string;
  value?: string;
  remove_values?: string[];
};

export type MockMemory = {
  user_goal: string;
  preferences: string[];
  locations: string[];
  equipment: string[];
  risks: string[];
  observations: string[];
  pending_updates: PendingMemoryUpdate[];
  confirmed_updates: Array<{
    id: string;
    target: string;
    content: string;
    reason: string;
    category?: MemoryUpdateInput["category"];
    operation?: MemoryUpdateInput["operation"];
    key?: string;
    value?: string;
    remove_values?: string[];
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

function normalizeText(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function sameSemanticUpdate(left: PendingMemoryUpdate, right: PendingMemoryUpdate): boolean {
  if (left.category && right.category && left.category === right.category) {
    return left.operation === right.operation && normalizeText(left.key || "") === normalizeText(right.key || "");
  }
  return normalizeText(left.content) === normalizeText(right.content);
}

function preferenceKeyFromText(value: string): string {
  return value
    .replace(/用户/g, "")
    .replace(/默认避免/g, "")
    .replace(/如确有价值需先解释/g, "")
    .replace(/如确有训练价值需先解释/g, "")
    .replace(/不太喜欢/g, "")
    .replace(/不喜欢/g, "")
    .replace(/挺喜欢/g, "")
    .replace(/很喜欢/g, "")
    .replace(/喜欢/g, "")
    .replace(/[；;，,。.]/g, "")
    .trim();
}

function preferenceMatchesKey(value: string, key: string): boolean {
  const normalizedValue = normalizeText(preferenceKeyFromText(value));
  const normalizedKey = normalizeText(key);
  return normalizedValue === normalizedKey || normalizedValue.includes(normalizedKey) || normalizedKey.includes(normalizedValue);
}

function applyPreferenceUpdate(memory: MockMemory, update: PendingMemoryUpdate): void {
  const key = update.key || preferenceKeyFromText(update.value || update.content);
  const removeValues = update.remove_values || [];
  const shouldRemove = (preference: string) => (
    removeValues.some((value) => normalizeText(value) === normalizeText(preference)) ||
    (key ? preferenceMatchesKey(preference, key) : false)
  );
  memory.preferences = memory.preferences.filter((preference) => !shouldRemove(preference));
  if (update.operation !== "remove" && update.value) {
    memory.preferences = uniq([...memory.preferences, update.value]);
  }
}

function applyMemoryUpdate(memory: MockMemory, update: PendingMemoryUpdate): void {
  if (update.category === "preference") applyPreferenceUpdate(memory, update);
}

function termInText(text: string, term: string): boolean {
  return normalizeText(text).includes(normalizeText(term));
}

function canonicalPreferenceTerm(term: string): string {
  const normalized = normalizeText(term);
  if (normalized.includes("hiit")) return "高强度 HIIT";
  if (normalized.includes("波比跳")) return "波比跳";
  return term.trim();
}

function extractPreferenceTerms(rawText: string, memory: MockMemory): string[] {
  const known = uniq([
    "波比跳",
    "高强度 HIIT",
    "高强度HIIT",
    "HIIT",
    ...memory.preferences.map(preferenceKeyFromText)
  ]);
  const direct = known.filter((term) => term && termInText(rawText, term)).map(canonicalPreferenceTerm);
  if (direct.length) return uniq(direct);
  const positiveWithoutExplicitObject = /(挺喜欢的|挺喜欢|很喜欢|我喜欢|我可以接受|愿意做)/.test(rawText);
  if (positiveWithoutExplicitObject) {
    return uniq(memory.preferences
      .filter((preference) => /不喜欢|不太喜欢|默认避免/.test(preference))
      .map((preference) => canonicalPreferenceTerm(preferenceKeyFromText(preference))));
  }
  return [];
}

export function preferenceMemoryUpdatesFromText(rawText: string, memory: MockMemory): MemoryUpdateInput[] {
  const isPositiveCorrection = /不是不喜欢|并不是不喜欢|没有不喜欢/.test(rawText);
  const isNegative = !isPositiveCorrection && /(不太喜欢|不喜欢|不爱|讨厌|不想做|默认避免)/.test(rawText);
  const isPositive = isPositiveCorrection || /(挺喜欢|很喜欢|喜欢|可以接受|愿意做|想做)/.test(rawText);
  if (!isPositive && !isNegative) return [];

  const terms = extractPreferenceTerms(rawText, memory);
  return terms.map((term) => {
    const existingMatches = memory.preferences.filter((preference) => preferenceMatchesKey(preference, term));
    const value = isNegative ? `不喜欢${term}` : `喜欢${term}`;
    return {
      target: "Hermes Memory",
      category: "preference",
      operation: "replace",
      key: term,
      value,
      remove_values: existingMatches,
      content: `将训练偏好更新为：${value}。`,
      reason: isNegative
        ? "用户明确表达了新的不喜欢偏好，需要替换旧偏好。"
        : "用户明确表达了喜欢或纠正了旧的不喜欢偏好，需要替换旧偏好。",
      requires_confirmation: true
    };
  });
}

export async function addPendingMemoryUpdates(updates: MemoryUpdateInput[] = [], stateRoot?: string): Promise<MockMemory> {
  const memory = await getMockMemory(stateRoot);
  const normalized = updates.map((update) => ({
    id: `mem-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    target: update.target || "Hermes Memory",
    content: update.content || "",
    reason: update.reason || "",
    requires_confirmation: update.requires_confirmation !== false,
    category: update.category,
    operation: update.operation,
    key: update.key,
    value: update.value,
    remove_values: update.remove_values
  }));
  const deduped = normalized.filter((update) => (
    !memory.pending_updates.some((existing) => sameSemanticUpdate(existing, update))
  ));
  memory.pending_updates.push(...deduped);
  return saveMockMemory(memory, stateRoot);
}

export async function confirmMemoryUpdate(id: string, stateRoot?: string): Promise<MockMemory> {
  const memory = await getMockMemory(stateRoot);
  const index = memory.pending_updates.findIndex((item) => item.id === id);
  if (index >= 0) {
    const [update] = memory.pending_updates.splice(index, 1);
    applyMemoryUpdate(memory, update);
    memory.confirmed_updates.push({
      id: update.id,
      target: update.target,
      content: update.content,
      reason: update.reason,
      category: update.category,
      operation: update.operation,
      key: update.key,
      value: update.value,
      remove_values: update.remove_values
    });
  }
  return saveMockMemory(memory, stateRoot);
}
