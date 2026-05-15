"use client";

import { useState } from "react";
import type { TrainingCard } from "../lib/types";
import { MarkdownBlock } from "./MarkdownBlock";

type EditableTrainingCardFields = Pick<TrainingCard, "date" | "timezone" | "location" | "duration" | "theme">;

function fallbackMarkdown(card: TrainingCard): string {
  return [
    `# ${card.theme || "训练记录"}`,
    "",
    `- 日期：${card.date || ""}`,
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
    timezone: card.timezone || "Asia/Singapore",
    location: card.location || "",
    duration: card.duration || "",
    theme: card.theme || ""
  });

  function startEditing() {
    setError("");
    setDraft({
      date: card.date || "",
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
            {card.date} · {card.location} · {card.duration || "时长未记录"}
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
                onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
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
