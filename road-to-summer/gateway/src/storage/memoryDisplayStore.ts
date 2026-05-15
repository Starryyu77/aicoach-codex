import type { TrainingCard } from "../hermes/types.ts";
import { getCurrentSession } from "./currentSessionStore.ts";
import { ensureStateDirs, getStorePaths, readJson, writeJson } from "./fileStore.ts";
import { getMockMemory, type MockMemory } from "./memoryStore.ts";
import { listTrainingCards } from "./trainingCardStore.ts";

export type MemoryDisplayItem = {
  label: string;
  detail?: string;
  source?: string;
  priority?: "normal" | "notice" | "risk";
};

export type MemoryDisplaySection = {
  id: string;
  title: string;
  description: string;
  items: MemoryDisplayItem[];
};

export type MemoryDisplaySnapshot = {
  updated_at: string;
  refresh_reason: string;
  headline: string;
  source_counts: {
    training_cards: number;
    pending_updates: number;
    confirmed_updates: number;
    observations: number;
  };
  sections: MemoryDisplaySection[];
  suggested_actions: string[];
};

function asText(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function firstTexts(values: unknown[] = [], limit = 3): string[] {
  return values.map(asText).filter(Boolean).slice(0, limit);
}

function memoryItems(values: string[] = [], source: string): MemoryDisplayItem[] {
  return values.filter(Boolean).map((value) => ({ label: value, source }));
}

function recentTrainingItems(cards: TrainingCard[]): MemoryDisplayItem[] {
  return cards.slice(0, 3).map((card) => ({
    label: `${card.date}${card.date_label ? ` · ${card.date_label}` : ""} · ${card.theme}`,
    detail: [
      firstTexts(card.body_feedback, 1)[0] ? `身体反馈：${firstTexts(card.body_feedback, 1)[0]}` : "",
      firstTexts(card.next_session_suggestions, 1)[0] ? `下次建议：${firstTexts(card.next_session_suggestions, 1)[0]}` : ""
    ].filter(Boolean).join(" ｜ "),
    source: card.id || card.storage_path || "training_card"
  }));
}

function riskItems(memory: MockMemory, cards: TrainingCard[]): MemoryDisplayItem[] {
  const fromMemory = memory.risks.map((label) => ({ label, source: "risk_memory", priority: "risk" as const }));
  const fromCards = cards.flatMap((card) => [
    ...firstTexts(card.pain_or_discomfort, 2).map((label) => ({
      label,
      detail: `${card.date} · ${card.theme}`,
      source: card.id || "training_card",
      priority: "risk" as const
    })),
    ...firstTexts(card.fatigue_notes, 2).map((label) => ({
      label,
      detail: `${card.date} · ${card.theme}`,
      source: card.id || "training_card",
      priority: "notice" as const
    }))
  ]);
  return [...fromMemory, ...fromCards].slice(0, 6);
}

function equipmentAndLocationItems(memory: MockMemory, cards: TrainingCard[]): MemoryDisplayItem[] {
  const memoryValues = [
    ...memory.locations.map((label) => ({ label, source: "location_memory" })),
    ...memory.equipment.map((label) => ({ label, source: "equipment_memory" }))
  ];
  const recentEquipment = cards.flatMap((card) => firstTexts(card.equipment_notes, 2).map((label) => ({
    label,
    detail: `${card.date} · ${card.theme}`,
    source: card.id || "training_card",
    priority: "notice" as const
  })));
  return [...memoryValues, ...recentEquipment].slice(0, 8);
}

function pendingItems(memory: MockMemory): MemoryDisplayItem[] {
  return memory.pending_updates.slice(0, 5).map((item) => ({
    label: item.content,
    detail: item.reason,
    source: item.target,
    priority: "notice"
  }));
}

function buildHeadline(memory: MockMemory, cards: TrainingCard[]): string {
  const latest = cards[0];
  const pending = memory.pending_updates.length;
  const latestText = latest ? `最近训练：${latest.date} ${latest.theme}` : `目标：${memory.user_goal}`;
  return pending ? `${latestText}；有 ${pending} 条待确认记忆。` : `${latestText}；暂无待确认记忆。`;
}

export async function refreshMemoryDisplay(reason = "manual", stateRoot?: string): Promise<MemoryDisplaySnapshot> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  const [memory, cards, session] = await Promise.all([
    getMockMemory(stateRoot),
    listTrainingCards(stateRoot),
    getCurrentSession(stateRoot)
  ]);

  const sections: MemoryDisplaySection[] = [
    {
      id: "training_direction",
      title: "当前训练方向",
      description: "来自用户目标、当前 session 和最近一次训练。",
      items: ([
        { label: memory.user_goal, detail: "长期训练目标", source: "user_goal" },
        session.target_date ? { label: `${session.target_date_label || "目标日期"} ${session.target_date}`, detail: session.theme || "当前 session", source: session.id || "current_session" } : undefined,
        cards[0] ? { label: `${cards[0].date} ${cards[0].theme}`, detail: "最近训练卡", source: cards[0].id || "latest_training_card" } : undefined
      ] as Array<MemoryDisplayItem | undefined>).filter((item): item is MemoryDisplayItem => Boolean(item))
    },
    {
      id: "recent_training",
      title: "最近训练沉淀",
      description: "从历史训练卡片中整理出最近的训练事实。",
      items: recentTrainingItems(cards)
    },
    {
      id: "risk_recovery",
      title: "风险与恢复信号",
      description: "合并长期风险和最近训练中的疲劳、疼痛、不适。",
      items: riskItems(memory, cards)
    },
    {
      id: "equipment_location",
      title: "场地与器械记忆",
      description: "展示稳定场地/器械信息和近期器械反馈。",
      items: equipmentAndLocationItems(memory, cards)
    },
    {
      id: "preferences_observations",
      title: "偏好与观察",
      description: "保留偏好，观察信息不直接升级成规则。",
      items: [
        ...memoryItems(memory.preferences, "preference_memory"),
        ...memoryItems(memory.observations, "observation_memory")
      ].slice(0, 8)
    },
    {
      id: "pending_updates",
      title: "待确认记忆",
      description: "这些内容只在确认后才写入长期记忆。",
      items: pendingItems(memory)
    }
  ];

  const snapshot: MemoryDisplaySnapshot = {
    updated_at: new Date().toISOString(),
    refresh_reason: reason,
    headline: buildHeadline(memory, cards),
    source_counts: {
      training_cards: cards.length,
      pending_updates: memory.pending_updates.length,
      confirmed_updates: memory.confirmed_updates.length,
      observations: memory.observations.length
    },
    sections,
    suggested_actions: [
      memory.pending_updates.length ? "先确认或忽略待写入记忆。" : "暂无待确认记忆。",
      cards[0] ? `下次计划前重点读取 ${cards[0].date} 的训练反馈。` : "完成或补录一次训练后，展示层会更具体。",
      "复盘历史训练时只生成 review，不新增训练卡。"
    ]
  };

  await writeJson(paths.memoryDisplayFile, snapshot);
  return snapshot;
}

export async function getMemoryDisplay(stateRoot?: string): Promise<MemoryDisplaySnapshot> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  const cached = await readJson<MemoryDisplaySnapshot | null>(paths.memoryDisplayFile, null);
  return cached || refreshMemoryDisplay("initial_build", stateRoot);
}
