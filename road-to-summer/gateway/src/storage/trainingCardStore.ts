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
  date_label?: string;
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

async function withMarkdown(card: TrainingCard, jsonPath: string): Promise<TrainingCard> {
  const markdownPath = card.markdown_path || jsonPath.replace(/\.json$/, ".md");
  let markdown = card.markdown;
  if (!markdown) {
    try {
      markdown = await readFile(markdownPath, "utf8");
    } catch {
      markdown = createTrainingCardMarkdown(card);
      await writeFile(markdownPath, markdown, "utf8");
    }
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

export async function saveTrainingCard(card: TrainingCard, stateRoot?: string): Promise<TrainingCard> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  const id = card.id || `card-${Date.now()}`;
  const filePath = path.join(paths.trainingCardsDir, `${id}.json`);
  const markdownPath = path.join(paths.trainingCardsDir, `${id}.md`);
  const markdown = card.markdown || createTrainingCardMarkdown({ ...card, id, storage_path: filePath, markdown_path: markdownPath });
  const saved = { ...card, id, storage_path: filePath, markdown_path: markdownPath, markdown };
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
        return card ? withMarkdown(card, filePath) : null;
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
  return card ? withMarkdown(card, filePath) : null;
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
    date_label: patch.date_label !== undefined ? cleanText(patch.date_label) : existing.date_label,
    timezone: patch.timezone !== undefined ? cleanText(patch.timezone) : existing.timezone,
    location: patch.location !== undefined ? cleanText(patch.location) || existing.location : existing.location,
    duration: patch.duration !== undefined ? cleanText(patch.duration) : existing.duration,
    theme: patch.theme !== undefined ? cleanText(patch.theme) || existing.theme : existing.theme
  };
  next.markdown = createTrainingCardMarkdown(next);
  await writeJson(filePath, next);
  await writeFile(next.markdown_path || filePath.replace(/\.json$/, ".md"), next.markdown, "utf8");
  return next;
}
