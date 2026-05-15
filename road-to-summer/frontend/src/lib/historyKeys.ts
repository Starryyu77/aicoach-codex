import type { TrainingCard } from "./types";

function cleanText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function historyCardKey(card: Partial<TrainingCard>, index: number): string {
  const id = cleanText(card.id);
  if (id) return `id:${id}`;

  const fallback = [
    cleanText(card.storage_path),
    cleanText(card.markdown_path),
    cleanText(card.date),
    cleanText(card.completed_at),
    cleanText(card.theme),
    cleanText(card.location)
  ].filter(Boolean).join("|");

  return `fallback:${index}:${fallback || "unknown"}`;
}
