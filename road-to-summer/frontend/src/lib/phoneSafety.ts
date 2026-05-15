import type { OfficialSourceTrace, PlanItem, PlanSection } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown, fallback = ""): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

export function phoneActionLabel(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (!isRecord(value)) return "";
  return text(value.label || value.action || value.next_instruction || value.title || value.text);
}

export function normalizePhoneActions(value: unknown, fallback: string[] = []): string[] {
  const seen = new Set<string>();
  const source = Array.isArray(value) ? value : fallback;
  return source
    .map(phoneActionLabel)
    .filter((action) => {
      if (!action || action === "[object Object]" || seen.has(action)) return false;
      seen.add(action);
      return true;
    });
}

export function canOpenCameraForTraining(input: {
  hasPlan: boolean;
  hasCurrentTarget: boolean;
  phase?: string;
  isBusy?: boolean;
}): boolean {
  return Boolean(
    input.hasPlan &&
    input.hasCurrentTarget &&
    !input.isBusy &&
    input.phase !== "ended" &&
    input.phase !== "completed"
  );
}

export function safeExternalHref(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function isPlanItem(item: PlanItem | string): item is PlanItem {
  return typeof item === "object" && item !== null && "exercise" in item;
}

export function phonePlanSectionKey(section: Pick<PlanSection, "section_id" | "name">, index: number): string {
  return `${section.section_id || section.name || "section"}-${index}`;
}

export function phonePlanItemKey(section: Pick<PlanSection, "section_id" | "name">, item: PlanItem | string, index: number): string {
  const sectionKey = section.section_id || section.name || "section";
  const itemKey = isPlanItem(item) ? (item.item_id || item.exercise) : item;
  return `${sectionKey}-${index}-${itemKey || "item"}`;
}

export function phoneSourceTraceKey(source: OfficialSourceTrace, index: number): string {
  return `${source.framework || source.official_source || source.model || "source"}-${index}`;
}
