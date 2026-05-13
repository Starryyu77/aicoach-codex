import path from "node:path";
import type { TrainingCard } from "../hermes/types.ts";
import { ensureStateDirs, getStorePaths, listJsonFiles, readJson, writeJson } from "./fileStore.ts";

export async function saveTrainingCard(card: TrainingCard, stateRoot?: string): Promise<TrainingCard> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  const id = card.id || `card-${Date.now()}`;
  const saved = { ...card, id };
  await writeJson(path.join(paths.trainingCardsDir, `${id}.json`), saved);
  return saved;
}

export async function listTrainingCards(stateRoot?: string): Promise<TrainingCard[]> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  return listJsonFiles<TrainingCard>(paths.trainingCardsDir);
}

export async function getTrainingCard(id: string, stateRoot?: string): Promise<TrainingCard | null> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  return readJson<TrainingCard | null>(path.join(paths.trainingCardsDir, `${id}.json`), null);
}

