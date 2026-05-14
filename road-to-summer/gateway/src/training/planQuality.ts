import type { OfficialSourceTrace, PlanCard, PlanItem, PlanSection, TrainingCard } from "../hermes/types.ts";
import { sourceNoteForRole, withPlanSourceNotes } from "./sourceNotes.ts";

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
      conflicts.push(`${session.days_ago} 天前有肩部训练负荷（${session.date} ${session.theme}），今天不应再安排高容量胸背肩组合`);
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

function recoveryPlan(base: PlanCard, report: PlanQualityReport): PlanCard {
  const label = base.date_label || "目标日";
  const date = base.target_date || "";
  const officialSourceTrace: OfficialSourceTrace[] = [
    {
      framework: "NSCA Program Design",
      model: "NSCA program design / Essentials of Personal Training",
      official_source: "NSCA Determination of Resistance Training Frequency",
      source_url: "https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/",
      source_location: "NSCA 训练频率资料：训练频率受动作选择、每次训练肌群、训练量、强度、训练状态和压力影响。",
      principle: "先看最近训练压力和恢复状态，再决定是否重复某个肌群或动作模式。",
      applied_decision: "Gateway 发现最近训练记录存在肌群冲突，所以把原计划改成恢复与功能维护。",
      why_it_matters: "这样用户能看到计划被调整的原因，而不是被系统静默覆盖。"
    },
    {
      framework: "NASM OPT",
      model: "Optimum Performance Training Model",
      official_source: "NASM OPT Model",
      source_url: "https://www.nasm.org/certified-personal-trainer/the-opt-model",
      source_location: "NASM OPT 模型页面：训练阶段从稳定耐力、力量耐力、肌肉发展到最大力量和爆发力逐步推进。",
      principle: "准备度或恢复不足时，先回退到稳定、控制和低风险训练。",
      applied_decision: "本次计划使用动作控制、活动度和低强度内容，而不是再安排高容量力量训练。",
      why_it_matters: "用户能理解为什么训练变轻，不会误以为系统只是过度保守。"
    },
    {
      framework: "ACSM 2026",
      model: "Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults",
      official_source: "ACSM 2026 Resistance Training Guidelines Update",
      source_url: "https://acsm.org/resistance-training-guidelines-update-2026/",
      source_location: "ACSM 2026 抗阻训练指南更新：训练变量需要匹配目标，并考虑个体化和持续执行。",
      principle: "训练变量要服务目标；恢复和身体功能也可以是明确训练目标。",
      applied_decision: "本次优先身体功能和恢复变量，而不是肌肥大或力量负荷。",
      why_it_matters: "用户能看到低强度并不等于无效，而是目标不同。"
    }
  ];
  return withPlanSourceNotes({
    ...base,
    title: `${label}恢复与功能维护`,
    duration: "25-40 分钟",
    goal: "避开最近 48-72 小时已高频刺激的肌群，优先恢复检查、活动度、核心稳定和低强度心肺。",
    sections: [
      {
        name: "状态检查",
        items: [
          {
            exercise: "下肢恢复状态快速检查",
            role: "warmup",
            movement_pattern: "恢复检查",
            primary_muscles: ["下肢"],
            selection_reason: "近期下肢训练后仍可能有酸感，先用低负荷动作确认是否适合进入训练。",
            source_note: sourceNoteForRole("warmup", "下肢恢复状态快速检查"),
            common_mistakes: ["把检查做成训练", "有疼痛仍继续加量"],
            adjustment_rule: "出现疼痛、麻木或明显酸感时停止负重训练。",
            sets: "1",
            reps: "步行来回 + 深蹲 5 次",
            intensity: "轻",
            rest: "0 秒",
            cue: "检查左腿后侧、小腿和髋前侧是否还酸；如有疼痛，不进入负重训练。",
            substitutions: ["轻松快走 5 分钟"]
          },
          {
            exercise: "肩颈与肩胛状态检查",
            role: "warmup",
            movement_pattern: "肩胛控制检查",
            primary_muscles: ["肩胛稳定", "肩部"],
            selection_reason: "近期上肢和肩背负荷较高时，先确认肩前侧和肩胛活动状态。",
            source_note: sourceNoteForRole("warmup", "肩颈与肩胛状态检查"),
            common_mistakes: ["耸肩", "追求酸胀", "用力过猛"],
            adjustment_rule: "肩前侧疼痛或卡住时停止上肢推拉训练。",
            sets: "1",
            reps: "手臂画圈 8 次/方向",
            intensity: "轻",
            rest: "0 秒",
            cue: "只确认肩前侧和肩胛活动感，不做疲劳性训练。",
            substitutions: ["墙天使 6-8 次"]
          }
        ]
      },
      {
        name: "主训练",
        items: [
          {
            exercise: "全身活动度循环",
            role: "main",
            movement_pattern: "活动度 / 技术控制",
            primary_muscles: ["全身"],
            selection_reason: "在最近训练冲突时保留训练价值，同时降低对胸背肩和下肢后链的重复刺激。",
            source_note: sourceNoteForRole("main", "全身活动度循环"),
            common_mistakes: ["做成高强度循环", "追求拉痛"],
            adjustment_rule: "任何动作出现疼痛就缩小幅度或跳过。",
            sets: "3",
            reps: "髋铰链 8 次 + 胸椎旋转 6 次/侧 + 猫牛式 6 次",
            intensity: "RPE 3-4",
            rest: "45 秒",
            cue: "动作范围舒服即可，不追求酸胀和泵感。",
            substitutions: ["瑜伽流动 8-10 分钟"]
          },
          {
            exercise: "死虫",
            role: "functional_core",
            movement_pattern: "核心抗伸展",
            primary_muscles: ["核心"],
            selection_reason: "低疲劳补核心控制，适合恢复与功能维护日。",
            source_note: sourceNoteForRole("functional_core", "死虫"),
            common_mistakes: ["憋气", "腰拱", "动作太快"],
            adjustment_rule: "腰拱起时缩短动作范围。",
            sets: "3",
            reps: "每侧 8-10 次",
            intensity: "可控",
            rest: "45 秒",
            cue: "腰不要拱起，保持呼吸，不把它做成高强度核心训练。",
            substitutions: ["鸟狗"]
          }
        ]
      },
      {
        name: "低强度心肺",
        items: [
          {
            exercise: "划船机或快走",
            role: "cardio",
            movement_pattern: "低强度心肺",
            primary_muscles: ["心肺"],
            selection_reason: "用低强度促进恢复，不继续制造高系统疲劳。",
            source_note: sourceNoteForRole("cardio", "划船机或快走"),
            common_mistakes: ["恢复日做太猛", "腿不适还硬拉划船机"],
            adjustment_rule: "腿后侧不适时改快走或停止。",
            sets: "1",
            reps: "8-12 分钟",
            intensity: "RPE 3-4",
            rest: "-",
            cue: "能完整说话的强度；腿后侧不适就改快走或停止。",
            substitutions: ["室内轻松步行"]
          }
        ]
      },
      {
        name: "放松",
        items: [
          {
            exercise: "髋屈肌 + 胸椎 + 背阔轻拉伸",
            role: "cooldown",
            movement_pattern: "放松 / 活动度",
            primary_muscles: ["髋", "胸椎", "背阔"],
            selection_reason: "整理近期训练后容易紧张的髋前侧、胸椎和背阔，服务下一次训练恢复。",
            source_note: sourceNoteForRole("cooldown", "髋屈肌 + 胸椎 + 背阔轻拉伸"),
            common_mistakes: ["拉到疼", "憋气"],
            adjustment_rule: "只拉到舒服，疼痛时停止。",
            sets: "1",
            reps: "每处 30-45 秒",
            intensity: "轻",
            rest: "0 秒",
            cue: "拉到舒服，不追求疼痛感。",
            substitutions: ["泡沫轴轻松放松"]
          }
        ]
      }
    ],
    risk_notes: uniq([
      ...report.conflicts,
      "如腿后侧、小腿或髋前侧酸感未缓解，低强度心肺改为轻松步行或停止。",
      "肩前侧出现疼痛、麻木或关节不稳定时，停止肩颈检查动作。"
    ]),
    reasoning: [
      "Gateway 计划质量检查发现原计划与最近训练记录存在冲突，因此改为恢复与功能维护。",
      ...report.recent_summary.map((item) => `最近训练：${item}`),
      "今天不继续堆胸背肩或高强度下肢，避免连续刺激肩背和下肢后链；保留轻量活动度、核心控制和低强度心肺。"
    ].join("\n"),
    framework_trace: [
      "ACE IFT: 根据当前可恢复性降低训练复杂度，保留用户可执行的活动。",
      "NASM OPT: 从增肌/力量训练回退到稳定耐力和动作控制。",
      "NSCA Program Design: 因最近训练冲突调整 session type 和总负荷。",
      "ACSM 2026: 将本次目标改为身体功能和恢复，而不是继续追求高刺激变量。",
      "RPE/RIR Autoregulation: 用低 RPE 和疼痛停止规则控制训练风险。"
    ],
    official_source_trace: officialSourceTrace,
    decision_basis: [
      ...report.recent_summary,
      "规则：最近 48-72 小时刚训练过的主肌群，不作为今天主训练重复安排。",
      "规则：有明显疲劳/酸感时，优先恢复检查和低强度训练。"
    ],
    recent_training_summary: report.recent_summary,
    quality_warnings: report.conflicts
  });
}

export function enforcePlanQuality(plan: PlanCard, recentCards: TrainingCard[]): PlanQualityResult {
  const report = analyzePlanQuality(plan, recentCards);
  const { sections, duplicates } = dedupePlanSections(plan.sections);
  const deduped: PlanCard = {
    ...plan,
    sections: withPlanSourceNotes({ ...plan, sections }).sections,
    decision_basis: plan.decision_basis?.length ? plan.decision_basis : [
      ...report.recent_summary,
      "规则：先看最近 1-3 次训练，再决定今天主训练肌群。",
      "规则：计划生成后做动作去重和冲突检查。"
    ],
    recent_training_summary: report.recent_summary,
    quality_warnings: uniq([...(plan.quality_warnings || []), ...report.conflicts, ...duplicates.map((item) => `已移除重复动作：${item}`)])
  };
  if (report.conflicts.length) {
    return {
      plan: recoveryPlan(deduped, { ...report, duplicate_exercises: duplicates }),
      report: { ...report, duplicate_exercises: duplicates },
      adjusted: true
    };
  }
  return {
    plan: deduped,
    report: { ...report, duplicate_exercises: duplicates },
    adjusted: duplicates.length > 0
  };
}
