import type { TrainingCard } from "../lib/types";
import { MarkdownBlock } from "./MarkdownBlock";

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

export function TrainingCardView({ card, onDelete }: { card: TrainingCard; onDelete?: (card: TrainingCard) => void }) {
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
        {onDelete ? (
          <button className="rounded-md border border-[#d8b9b9] px-3 py-1.5 text-xs font-medium text-[#9b2f2f] hover:bg-[#fff3f3]" onClick={() => onDelete(card)} type="button">
            删除
          </button>
        ) : null}
      </div>
      <div className="mt-4 rounded-md bg-[#f7faf5] p-4">
        <MarkdownBlock content={card.markdown || fallbackMarkdown(card)} />
      </div>
    </article>
  );
}
