import type { TrainingCard } from "../lib/types";

export function TrainingCardView({ card }: { card: TrainingCard }) {
  return (
    <article className="rounded-lg bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{card.theme}</h2>
          <p className="text-sm text-[#536158]">{card.date} · {card.location} · {card.duration || "时长未记录"}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Section title="原计划" value={card.planned} />
        <Section title="实际完成" value={card.actual_completed} />
        <Section title="临时调整" value={card.adjustments} />
        <Section title="身体反馈" value={card.body_feedback} />
        <Section title="器械问题" value={card.equipment_notes} />
        <Section title="未完成内容" value={card.unfinished_items} />
      </div>
      <div className="mt-4 rounded-md bg-[#f4f7f2] p-3 text-sm">
        下次建议：{card.next_session_suggestions.join(" / ") || "暂无"}
      </div>
    </article>
  );
}

function Section({ title, value }: { title: string; value: unknown[] }) {
  return (
    <div className="rounded-md border border-[#e0e7df] p-3">
      <div className="text-xs text-[#536158]">{title}</div>
      <pre className="mt-2 whitespace-pre-wrap text-xs">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

