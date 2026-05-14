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

function assertTrainingCardId(id: string): string {
  if (!/^card-\d+$/.test(id)) {
    throw new Error("Invalid training card id.");
  }
  return id;
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
    return cards.filter((card): card is TrainingCard => card !== null);
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
