import type { PlanCard, PlanItem } from "../lib/types";
import { MarkdownBlock } from "./MarkdownBlock";

function isPlanItem(item: PlanItem | string): item is PlanItem {
  return typeof item === "object" && item !== null && "exercise" in item;
}

function itemLabel(item: PlanItem | string) {
  return isPlanItem(item) ? item.exercise : item;
}

const BASIS = ["用户目标", "当前状态", "场地器械", "最近训练", "偏好风险"];

export function CurrentPlanCard({ plan, storagePath }: { plan?: PlanCard; storagePath?: string }) {
  return (
    <section className="rounded-lg border border-[#dfe6dc] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">当前计划</h2>
          <p className="mt-1 text-sm text-[#536158]">
            Hermes 返回的结构化计划，Gateway 会保存为本地 UI 状态。
            {plan?.target_date ? ` 目标日期：${plan.date_label || ""} ${plan.target_date}` : ""}
          </p>
        </div>
        {storagePath ? <div className="rounded-md bg-[#eef2ec] px-2 py-1 font-mono text-[11px] text-[#536158]">{storagePath}</div> : null}
      </div>
      {!plan ? (
        <p className="mt-3 text-sm text-[#536158]">点击“生成今日计划”后，Hermes 会返回结构化训练计划卡片。</p>
      ) : (
        <div className="mt-4 grid gap-4">
          {plan.sections.map((section) => (
            <div key={section.name}>
              <h3 className="text-sm font-semibold text-[#1f7a5a]">{section.name}</h3>
              <div className="mt-2 overflow-hidden rounded-md border border-[#e0e7df]">
                {section.items.map((item, index) => {
                  const key = `${section.name}-${index}-${itemLabel(item)}`;
                  if (!isPlanItem(item)) {
                    return (
                      <div className="border-b border-[#e0e7df] bg-[#fbfcfa] p-3 last:border-b-0" key={key}>
                        <div className="text-xs font-medium text-[#6b776f]">说明</div>
                        <div className="mt-1 text-sm leading-6 text-[#26332b]"><MarkdownBlock compact content={item} /></div>
                      </div>
                    );
                  }
                  return (
                    <div className="grid gap-2 border-b border-[#e0e7df] p-3 last:border-b-0 md:grid-cols-[1.1fr_0.8fr_0.8fr]" key={key}>
                      <div>
                        <div className="font-medium">{item.exercise}</div>
                        <div className="mt-1 text-sm leading-5 text-[#536158]">{item.cue || "暂无 cue"}</div>
                      </div>
                      <div className="text-sm text-[#536158]">{item.sets || "-"} x {item.reps || "-"} · {item.intensity || "-"}</div>
                      <div className="text-sm text-[#536158]">休息 {item.rest || "-"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="rounded-md border border-[#dfe6dc] bg-[#f7faf5] p-4">
            <div className="text-sm font-semibold">生成依据</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {BASIS.map((item) => (
                <span className="rounded-full border border-[#d7e1d6] bg-white px-2 py-1 text-xs text-[#536158]" key={item}>{item}</span>
              ))}
            </div>
            <div className="mt-3 text-sm leading-6 text-[#536158]">
              <MarkdownBlock compact content={plan.reasoning || "Hermes 未返回 reasoning；需要回到 Skill output_contract 中补强该字段。"} />
            </div>
            {plan.risk_notes?.length ? (
              <div className="mt-3 text-sm text-[#8a5b16]">风险提醒：{plan.risk_notes.join(" / ")}</div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
