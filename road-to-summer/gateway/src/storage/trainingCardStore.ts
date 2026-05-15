import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TrainingCard } from "../hermes/types.ts";
import { ensureStateDirs, getStorePaths, readJson, writeJson } from "./fileStore.ts";
import { createTrainingCardMarkdown } from "./trainingCardMarkdown.ts";

export type DeleteTrainingCardResult = {
  deleted: boolean;
  id: string;
  removed_paths: string[];
};

export type UpdateTrainingCardInput = {
  date?: string;
  timezone?: string;
  location?: string;
  duration?: string;
  theme?: string;
};

function assertTrainingCardId(id: string): string {
  if (!/^card-\d+$/.test(id)) {
    throw new Error("Invalid training card id.");
  }
  return id;
}

function assertIsoDate(date?: string): string | undefined {
  if (date === undefined) return undefined;
  const trimmed = String(date).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Invalid training card date. Use YYYY-MM-DD.");
  }
  return trimmed;
}

function cleanText(value?: string): string | undefined {
  if (value === undefined) return undefined;
  return String(value).trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function values(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeTrainingCard(value: unknown): TrainingCard | null {
  if (!isRecord(value)) return null;
  if (value.type === "training_plan" && !value.completed_at && !value.training_card) return null;

  const date = text(value.date);
  const theme = text(value.theme || value.title, "训练记录");
  const duration = text(value.duration, "");
  const location = text(value.location, "公寓健身房");
  const planned = values(value.planned).length
    ? values(value.planned)
    : values(value.plan || value.sections);
  const actualCompleted = values(value.actual_completed).length
    ? values(value.actual_completed)
    : values(value.completed_exercises || value.completed_items);
  const hasCompletionSignal = Boolean(value.completed_at) || actualCompleted.length > 0 || values(value.actual_completed).length > 0;

  if (!date || !hasCompletionSignal) return null;

  return {
    ...value,
    id: text(value.id) || undefined,
    storage_path: text(value.storage_path) || undefined,
    markdown_path: text(value.markdown_path) || undefined,
    markdown: text(value.markdown) || undefined,
    date,
    timezone: text(value.timezone) || undefined,
    date_label: undefined,
    completed_at: text(value.completed_at) || undefined,
    location,
    duration,
    theme,
    planned,
    actual_completed: actualCompleted,
    adjustments: values(value.adjustments),
    equipment_notes: values(value.equipment_notes),
    body_feedback: values(value.body_feedback),
    fatigue_notes: values(value.fatigue_notes),
    pain_or_discomfort: values(value.pain_or_discomfort),
    unfinished_items: values(value.unfinished_items),
    next_session_suggestions: values(value.next_session_suggestions || value.next_actions).map((item) => text(item)).filter(Boolean)
  };
}

async function withMarkdown(card: TrainingCard, jsonPath: string): Promise<TrainingCard> {
  const markdownPath = card.markdown_path || jsonPath.replace(/\.json$/, ".md");
  const expectedMarkdown = createTrainingCardMarkdown(card);
  let markdown = card.markdown;
  try {
    markdown = markdown || await readFile(markdownPath, "utf8");
  } catch {
    markdown = "";
  }
  if (markdown !== expectedMarkdown) {
    markdown = expectedMarkdown;
    await writeFile(markdownPath, markdown, "utf8");
  }
  return {
    ...card,
    storage_path: card.storage_path || jsonPath,
    markdown_path: markdownPath,
    markdown
  };
}

function sortCards(cards: TrainingCard[]): TrainingCard[] {
  return [...cards].sort((a, b) => {
    const dateCompare = (b.date || "").localeCompare(a.date || "");
    if (dateCompare !== 0) return dateCompare;
    return (b.id || "").localeCompare(a.id || "");
  });
}

function isTrainingCard(value: unknown): value is TrainingCard {
  return normalizeTrainingCard(value) !== null;
}

export async function saveTrainingCard(card: TrainingCard, stateRoot?: string): Promise<TrainingCard> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  const normalized = normalizeTrainingCard(card);
  if (!normalized) throw new Error("Invalid training card shape.");
  const id = normalized.id || `card-${Date.now()}`;
  const filePath = path.join(paths.trainingCardsDir, `${id}.json`);
  const markdownPath = path.join(paths.trainingCardsDir, `${id}.md`);
  const savedBase = { ...normalized, id, storage_path: filePath, markdown_path: markdownPath };
  const markdown = createTrainingCardMarkdown(savedBase);
  const saved = { ...savedBase, markdown };
  await writeJson(filePath, saved);
  await writeFile(markdownPath, markdown, "utf8");
  return saved;
}

export async function listTrainingCards(stateRoot?: string): Promise<TrainingCard[]> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  try {
    const names = (await readdir(paths.trainingCardsDir)).filter((name) => name.endsWith(".json")).sort().reverse();
    const cards = await Promise.all(
      names.map(async (name) => {
        const filePath = path.join(paths.trainingCardsDir, name);
        const card = await readJson<TrainingCard | null>(filePath, null);
        const normalized = normalizeTrainingCard(card);
        if (!normalized) return null;
        const withPaths = {
          ...normalized,
          storage_path: normalized.storage_path || filePath,
          markdown_path: normalized.markdown_path || filePath.replace(/\.json$/, ".md")
        };
        if (!isTrainingCard(withPaths)) return null;
        await writeJson(filePath, withPaths);
        const updated = await withMarkdown(withPaths, filePath);
        await writeJson(filePath, updated);
        return updated;
      })
    );
    return sortCards(cards.filter((card): card is TrainingCard => card !== null));
  } catch {
    return [];
  }
}

export async function getTrainingCard(id: string, stateRoot?: string): Promise<TrainingCard | null> {
  const safeId = assertTrainingCardId(id);
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  const filePath = path.join(paths.trainingCardsDir, `${safeId}.json`);
  const card = await readJson<TrainingCard | null>(filePath, null);
  const normalized = normalizeTrainingCard(card);
  if (!normalized) return null;
  const updated = await withMarkdown(normalized, filePath);
  await writeJson(filePath, updated);
  return updated;
}

export async function deleteTrainingCard(id: string, stateRoot?: string): Promise<DeleteTrainingCardResult> {
  const safeId = assertTrainingCardId(id);
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  const jsonPath = path.join(paths.trainingCardsDir, `${safeId}.json`);
  const markdownPath = path.join(paths.trainingCardsDir, `${safeId}.md`);
  const removed: string[] = [];
  for (const filePath of [jsonPath, markdownPath]) {
    try {
      await rm(filePath, { force: true });
      removed.push(filePath);
    } catch {
      // rm with force should already tolerate missing files; keep the route idempotent.
    }
  }
  return {
    deleted: removed.length > 0,
    id: safeId,
    removed_paths: removed
  };
}

export async function updateTrainingCard(id: string, patch: UpdateTrainingCardInput, stateRoot?: string): Promise<TrainingCard> {
  const safeId = assertTrainingCardId(id);
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  const filePath = path.join(paths.trainingCardsDir, `${safeId}.json`);
  const existing = await readJson<TrainingCard | null>(filePath, null);
  if (!existing) throw new Error(`Training card not found: ${safeId}`);

  const next: TrainingCard = {
    ...existing,
    id: safeId,
    storage_path: filePath,
    markdown_path: path.join(paths.trainingCardsDir, `${safeId}.md`),
    date: assertIsoDate(patch.date) || existing.date,
    date_label: undefined,
    timezone: patch.timezone !== undefined ? cleanText(patch.timezone) : existing.timezone,
    location: patch.location !== undefined ? cleanText(patch.location) || existing.location : existing.location,
    duration: patch.duration !== undefined ? cleanText(patch.duration) || "" : existing.duration || "",
    theme: patch.theme !== undefined ? cleanText(patch.theme) || existing.theme : existing.theme
  };
  next.markdown = createTrainingCardMarkdown(next);
  await writeJson(filePath, next);
  await writeFile(next.markdown_path || filePath.replace(/\.json$/, ".md"), next.markdown, "utf8");
  return next;
}
