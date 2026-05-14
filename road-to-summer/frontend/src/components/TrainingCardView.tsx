"use client";

import { useState } from "react";
import type { TrainingCard } from "../lib/types";
import { MarkdownBlock } from "./MarkdownBlock";

type EditableTrainingCardFields = Pick<TrainingCard, "date" | "date_label" | "timezone" | "location" | "duration" | "theme">;

const DAY_MS = 24 * 60 * 60 * 1000;

function todayInTimezone(timezone = "Asia/Singapore") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function labelForDate(date: string, timezone?: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const today = todayInTimezone(timezone || "Asia/Singapore");
  const [fromYear, fromMonth, fromDay] = today.split("-").map(Number);
  const [toYear, toMonth, toDay] = date.split("-").map(Number);
  const offset = Math.round((Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) / DAY_MS);
  if (offset === -2) return "前天";
  if (offset === -1) return "昨天";
  if (offset === 0) return "今天";
  if (offset === 1) return "明天";
  if (offset === 2) return "后天";
  if (offset < 0) return `${Math.abs(offset)} 天前`;
  return `${offset} 天后`;
}

function fallbackMarkdown(card: TrainingCard): string {
  return [
    `# ${card.theme || "训练记录"}`,
    "",
    `- 日期：${card.date || ""}`,
    card.date_label ? `- 日期语义：${card.date_label}` : "",
    card.timezone ? `- 时区：${card.timezone}` : "",
    `- 场地：${card.location || ""}`,
    `- 时长：${card.duration || "未记录"}`,
    "",
    "## 原计划",
    JSON.stringify(card.planned || [], null, 2),
    "",
    "## 实际完成",
    JSON.stringify(card.actual_completed || [], null, 2),
    "",
    "## 临时调整",
    JSON.stringify(card.adjustments || [], null, 2),
    "",
    "## 身体反馈",
    (card.body_feedback || []).map((item) => `- ${String(item)}`).join("\n") || "- 无",
    "",
    "## 下次建议",
    (card.next_session_suggestions || []).map((item) => `- ${item}`).join("\n") || "- 无"
  ].join("\n");
}

export function TrainingCardView({
  card,
  onDelete,
  onUpdate
}: {
  card: TrainingCard;
  onDelete?: (card: TrainingCard) => void;
  onUpdate?: (card: TrainingCard, patch: Partial<EditableTrainingCardFields>) => Promise<void> | void;
}) {
  const [isEditing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<EditableTrainingCardFields>({
    date: card.date || "",
    date_label: card.date_label || "",
    timezone: card.timezone || "Asia/Singapore",
    location: card.location || "",
    duration: card.duration || "",
    theme: card.theme || ""
  });

  function startEditing() {
    setError("");
    setDraft({
      date: card.date || "",
      date_label: card.date_label || "",
      timezone: card.timezone || "Asia/Singapore",
      location: card.location || "",
      duration: card.duration || "",
      theme: card.theme || ""
    });
    setEditing(true);
  }

  async function save() {
    if (!onUpdate) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date || "")) {
      setError("训练日期必须是 YYYY-MM-DD。");
      return;
    }
    setError("");
    try {
      await onUpdate(card, draft);
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  return (
    <article className="rounded-lg border border-[#dfe6dc] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{card.theme}</h2>
          <p className="text-sm text-[#536158]">
            {card.date_label ? `${card.date_label} ` : ""}{card.date} · {card.location} · {card.duration || "时长未记录"}
          </p>
          {card.storage_path ? <p className="mt-1 font-mono text-xs text-[#536158]">{card.storage_path}</p> : null}
          {card.markdown_path ? <p className="mt-1 font-mono text-xs text-[#536158]">{card.markdown_path}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {onUpdate ? (
            <button className="rounded-md border border-[#c7d6ca] px-3 py-1.5 text-xs font-medium text-[#195b46] hover:bg-[#f2f7f3]" onClick={startEditing} type="button">
              编辑
            </button>
          ) : null}
          {onDelete ? (
            <button className="rounded-md border border-[#d8b9b9] px-3 py-1.5 text-xs font-medium text-[#9b2f2f] hover:bg-[#fff3f3]" onClick={() => onDelete(card)} type="button">
              删除
            </button>
          ) : null}
        </div>
      </div>
      {isEditing ? (
        <div className="mt-4 rounded-md border border-[#dfe6dc] bg-[#f7faf5] p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-[#536158]">训练日期</span>
              <input
                className="h-10 rounded-md border border-[#cfd9cf] bg-white px-3"
                type="date"
                value={draft.date || ""}
                onChange={(event) => {
                  const date = event.target.value;
                  setDraft((current) => ({
                    ...current,
                    date,
                    date_label: labelForDate(date, current.timezone)
                  }));
                }}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-[#536158]">日期语义</span>
              <input
                className="h-10 rounded-md border border-[#cfd9cf] bg-white px-3"
                value={draft.date_label || ""}
                onChange={(event) => setDraft((current) => ({ ...current, date_label: event.target.value }))}
                placeholder="例如：昨天 / 2 天前"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-[#536158]">时区</span>
              <input
                className="h-10 rounded-md border border-[#cfd9cf] bg-white px-3"
                value={draft.timezone || ""}
                onChange={(event) => setDraft((current) => ({ ...current, timezone: event.target.value }))}
              />
            </label>
            <label className="grid gap-1 text-sm md:col-span-3">
              <span className="text-xs text-[#536158]">训练主题</span>
              <input
                className="h-10 rounded-md border border-[#cfd9cf] bg-white px-3"
                value={draft.theme || ""}
                onChange={(event) => setDraft((current) => ({ ...current, theme: event.target.value }))}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-[#536158]">场地</span>
              <input
                className="h-10 rounded-md border border-[#cfd9cf] bg-white px-3"
                value={draft.location || ""}
                onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-[#536158]">时长</span>
              <input
                className="h-10 rounded-md border border-[#cfd9cf] bg-white px-3"
                value={draft.duration || ""}
                onChange={(event) => setDraft((current) => ({ ...current, duration: event.target.value }))}
              />
            </label>
          </div>
          {error ? <div className="mt-3 text-sm text-[#9b2f2f]">{error}</div> : null}
          <div className="mt-4 flex gap-2">
            <button className="rounded-md bg-[#195b46] px-3 py-1.5 text-sm font-medium text-white" onClick={save} type="button">
              保存
            </button>
            <button className="rounded-md border border-[#cfd9cf] px-3 py-1.5 text-sm font-medium text-[#314037]" onClick={() => setEditing(false)} type="button">
              取消
            </button>
          </div>
        </div>
      ) : null}
      <div className="mt-4 rounded-md bg-[#f7faf5] p-4">
        <MarkdownBlock content={card.markdown || fallbackMarkdown(card)} />
      </div>
    </article>
  );
}
