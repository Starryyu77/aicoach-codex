import type { PlanCard, PlanItem, PlanSection, TrainingCard } from "../hermes/types.ts";
import { withPlanSourceNotes } from "./sourceNotes.ts";

type MuscleGroup = "back" | "shoulders" | "chest" | "lower" | "glutes" | "core";

export type PlanQualityReport = {
  recent_summary: string[];
  plan_muscles: MuscleGroup[];
  recent_muscles: Array<{
    date: string;
    theme: string;
    days_ago: number;
    muscles: MuscleGroup[];
  }>;
  conflicts: string[];
  duplicate_exercises: string[];
};

export type PlanQualityResult = {
  plan: PlanCard;
  report: PlanQualityReport;
  adjusted: boolean;
};

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  back: "背部",
  shoulders: "肩部",
  chest: "胸部",
  lower: "下肢",
  glutes: "臀部",
  core: "核心"
};

function isPlanItem(item: PlanItem | string): item is PlanItem {
  return typeof item === "object" && item !== null && "exercise" in item;
}

function textOf(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function normalized(value: string): string {
  return value
    .replace(/[（(].*?[）)]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function uniq<T>(values: T[]): T[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function parseDate(date?: string): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function dayDiff(fromDate?: string, toDate?: string): number | null {
  const from = parseDate(fromDate);
  const to = parseDate(toDate);
  if (from === null || to === null) return null;
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

export function inferMuscles(text: string): MuscleGroup[] {
  const groups: MuscleGroup[] = [];
  if (/背|背阔|下拉|划船|面拉|face\s*pull|pull|胸背/.test(text)) groups.push("back");
  if (/肩|肩推|侧平举|肩胛|面拉|face\s*pull|胸背|上肢推拉/.test(text)) groups.push("shoulders");
  if (/胸|卧推|飞鸟|俯卧撑/.test(text)) groups.push("chest");
  if (/下肢|腿|深蹲|硬拉|罗马尼亚|rdl|分腿蹲|弓步|提踵|腿弯举/.test(text)) groups.push("lower");
  if (/臀|臀桥|臀推|髋外展|fire\s*hydrant|蛤壳/.test(text)) groups.push("glutes");
  if (/核心|平板|死虫|卷腹|bear\s*plank|支撑/.test(text)) groups.push("core");
  return uniq(groups);
}

function cardText(card: TrainingCard): string {
  return [
    card.theme,
    textOf(card.actual_completed),
    textOf(card.adjustments),
    textOf(card.body_feedback),
    textOf(card.fatigue_notes)
  ].join("\n");
}

function planText(plan: PlanCard): string {
  return [
    plan.title,
    plan.goal,
    ...plan.sections.flatMap((section) => [
      section.name,
      ...section.items.map((item) => isPlanItem(item) ? `${item.exercise} ${item.cue}` : item)
    ])
  ].join("\n");
}

function itemExercise(item: PlanItem | string): string {
  return isPlanItem(item) ? item.exercise : item;
}

function dedupePlanSections(sections: PlanSection[]): { sections: PlanSection[]; duplicates: string[] } {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  return {
    duplicates,
    sections: sections.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!isPlanItem(item)) return true;
        const key = normalized(item.exercise);
        if (!key) return true;
        if (seen.has(key)) {
          duplicates.push(item.exercise);
          return false;
        }
        seen.add(key);
        return true;
      })
    }))
  };
}

function conflictMessages(planMuscles: MuscleGroup[], recent: PlanQualityReport["recent_muscles"]): string[] {
  const conflicts: string[] = [];
  for (const session of recent) {
    if (session.days_ago < 0 || session.days_ago > 3) continue;
    const overlap = session.muscles.filter((muscle) => planMuscles.includes(muscle));
    const shoulderCarryover = session.muscles.includes("shoulders") && planMuscles.some((muscle) => muscle === "chest" || muscle === "back");
    if (overlap.length) {
      conflicts.push(`${session.days_ago} 天前刚练过 ${overlap.map((muscle) => MUSCLE_LABELS[muscle]).join("、")}（${session.date} ${session.theme}）`);
    } else if (shoulderCarryover) {
      conflicts.push(`${session.days_ago} 天前有肩部训练负荷（${session.date} ${session.theme}），目标日期不应再安排高容量胸背肩组合`);
    }
  }
  return uniq(conflicts);
}

function recentMuscleSummary(cards: TrainingCard[], targetDate?: string): PlanQualityReport["recent_muscles"] {
  return cards.slice(0, 5).flatMap((card) => {
    const days = dayDiff(card.date, targetDate);
    if (days === null) return [];
    return [{
      date: card.date,
      theme: card.theme,
      days_ago: days,
      muscles: inferMuscles(cardText(card))
    }];
  }).filter((item) => item.muscles.length);
}

export function analyzePlanQuality(plan: PlanCard, recentCards: TrainingCard[]): PlanQualityReport {
  const planMuscles = inferMuscles(planText(plan));
  const recent = recentMuscleSummary(recentCards, plan.target_date);
  const { duplicates } = dedupePlanSections(plan.sections);
  return {
    plan_muscles: planMuscles,
    recent_muscles: recent,
    conflicts: conflictMessages(planMuscles, recent),
    duplicate_exercises: uniq(duplicates),
    recent_summary: recent.slice(0, 3).map((item) => (
      `${item.date} ${item.theme}: ${item.muscles.map((muscle) => MUSCLE_LABELS[muscle]).join("、")}`
    ))
  };
}

export function enforcePlanQuality(plan: PlanCard, recentCards: TrainingCard[]): PlanQualityResult {
  const report = analyzePlanQuality(plan, recentCards);
  const { sections, duplicates } = dedupePlanSections(plan.sections);
  const sourceEnriched = withPlanSourceNotes({ ...plan, sections });
  const deduped: PlanCard = {
    ...sourceEnriched,
    decision_basis: plan.decision_basis?.length ? plan.decision_basis : [
      ...report.recent_summary,
      "规则：先看最近 1-3 次训练，再决定目标日期主训练肌群。",
      "规则：计划生成后做动作去重和冲突检查。"
    ],
    recent_training_summary: report.recent_summary,
    quality_warnings: uniq([...(plan.quality_warnings || []), ...report.conflicts, ...duplicates.map((item) => `已移除重复动作：${item}`)])
  };
  return {
    plan: deduped,
    report: { ...report, duplicate_exercises: duplicates },
    adjusted: duplicates.length > 0 || report.conflicts.length > 0
  };
}
