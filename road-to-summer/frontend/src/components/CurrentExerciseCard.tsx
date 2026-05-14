import type { PlanItem, SessionSnapshot } from "../lib/types";

type CurrentExerciseCardProps = {
  item?: PlanItem;
  session?: SessionSnapshot;
  onAction?: (action: string) => void;
};

export function CurrentExerciseCard({ item, session, onAction }: CurrentExerciseCardProps) {
  const canAct = Boolean(item && onAction);

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">当前动作</h2>
          <p className="mt-1 text-2xl font-semibold">{item?.exercise || "等待计划"}</p>
          {session?.progress ? <p className="mt-2 text-sm text-[#536158]">{session.progress}</p> : null}
        </div>
        <div className="grid gap-2 text-right">
          <div className="rounded-md bg-[#f4f7f2] px-3 py-2 text-sm">{item?.intensity || "RPE -"}</div>
          {session?.phase ? <div className="text-xs text-[#536158]">{session.phase}</div> : null}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md bg-[#f4f7f2] p-3">
          <div className="text-xs text-[#536158]">当前组 / 总组</div>
          <div className="mt-1 font-medium">{session?.current_set || 1} / {item?.sets || "-"}</div>
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
      {canAct ? (
        <div className="mt-4 rounded-md border border-[#dfe6dc] bg-[#f7faf5] p-3">
          <div className="text-xs font-medium text-[#536158]">当前动作操作</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              className="rounded-md bg-[#195b46] px-3 py-2 text-sm font-medium text-white hover:bg-[#124735] disabled:opacity-50"
              type="button"
              onClick={() => onAction?.("完成本组")}
            >
              完成本组
            </button>
            <button
              className="rounded-md border border-[#cfd9cf] bg-white px-3 py-2 text-sm hover:bg-[#eef4ec]"
              type="button"
              onClick={() => onAction?.("我感觉很好，没有任何酸痛")}
            >
              感觉很好，无酸痛
            </button>
            <button
              className="rounded-md border border-[#cfd9cf] bg-white px-3 py-2 text-sm hover:bg-[#eef4ec]"
              type="button"
              onClick={() => onAction?.("有点累")}
            >
              有点累
            </button>
            <button
              className="rounded-md border border-[#cfd9cf] bg-white px-3 py-2 text-sm hover:bg-[#eef4ec]"
              type="button"
              onClick={() => onAction?.("有点疼")}
            >
              有点疼
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
