import type { PlanItem } from "../lib/types";

export function CurrentExerciseCard({ item }: { item?: PlanItem }) {
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">当前动作</h2>
          <p className="mt-1 text-2xl font-semibold">{item?.exercise || "等待计划"}</p>
        </div>
        <div className="rounded-md bg-[#f4f7f2] px-3 py-2 text-sm">{item?.intensity || "RPE -"}</div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md bg-[#f4f7f2] p-3">
          <div className="text-xs text-[#536158]">组数</div>
          <div className="mt-1 font-medium">{item?.sets || "-"}</div>
        </div>
        <div className="rounded-md bg-[#f4f7f2] p-3">
          <div className="text-xs text-[#536158]">次数</div>
          <div className="mt-1 font-medium">{item?.reps || "-"}</div>
        </div>
        <div className="rounded-md bg-[#f4f7f2] p-3">
          <div className="text-xs text-[#536158]">休息</div>
          <div className="mt-1 font-medium">{item?.rest || "-"}</div>
        </div>
      </div>
      <div className="mt-4 rounded-md bg-[#fff8ed] p-4 text-sm">
        <div className="font-medium text-[#8a5b16]">动作 cue</div>
        <p className="mt-1">{item?.cue || "当前动作生成后显示普通用户可理解的动作提示。"}</p>
      </div>
      <div className="mt-3 text-sm text-[#536158]">
        替代动作：{item?.substitutions?.join(" / ") || "待生成"}
      </div>
    </section>
  );
}

