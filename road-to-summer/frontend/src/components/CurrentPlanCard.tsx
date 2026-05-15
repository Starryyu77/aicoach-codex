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
          {plan.sections.map((section, sectionIndex) => (
            <div key={section.section_id || `${section.name}-${sectionIndex}`}>
              <h3 className="text-sm font-semibold text-[#1f7a5a]">{section.name}</h3>
              <div className="mt-2 overflow-hidden rounded-md border border-[#e0e7df]">
                {section.items.map((item, index) => {
                  const key = isPlanItem(item) && item.item_id ? item.item_id : `${section.section_id || section.name}-${index}-${itemLabel(item)}`;
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
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">{item.exercise}</div>
                          {item.role ? <span className="rounded border border-[#d7e1d6] bg-[#f7faf5] px-1.5 py-0.5 text-[11px] text-[#536158]">{item.role}</span> : null}
                          {item.movement_pattern ? <span className="rounded border border-[#d7e1d6] bg-white px-1.5 py-0.5 text-[11px] text-[#536158]">{item.movement_pattern}</span> : null}
                        </div>
                        <div className="mt-1 text-sm leading-5 text-[#536158]">{item.cue || "暂无 cue"}</div>
                        {item.selection_reason ? (
                          <div className="mt-2 text-xs leading-5 text-[#6b776f]">选择理由：{item.selection_reason}</div>
                        ) : null}
                        {item.source_note ? (
                          <div className="mt-1 rounded-md border border-[#d7e1d6] bg-[#f7faf5] px-2 py-1.5 text-xs leading-5 text-[#314037]">
                            {item.source_note}
                          </div>
                        ) : null}
                        {item.adjustment_rule ? (
                          <div className="mt-1 text-xs leading-5 text-[#6b776f]">调整规则：{item.adjustment_rule}</div>
                        ) : null}
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
              {(plan.decision_basis?.length ? plan.decision_basis : BASIS).map((item) => (
                <span className="rounded-full border border-[#d7e1d6] bg-white px-2 py-1 text-xs text-[#536158]" key={item}>{item}</span>
              ))}
            </div>
            {plan.recent_training_summary?.length ? (
              <div className="mt-3 rounded-md border border-[#dfe6dc] bg-white p-3">
                <div className="text-xs font-semibold text-[#536158]">最近训练读取</div>
                <ul className="mt-2 grid gap-1 text-xs leading-5 text-[#536158]">
                  {plan.recent_training_summary.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {plan.framework_trace?.length ? (
              <div className="mt-3 rounded-md border border-[#dfe6dc] bg-white p-3">
                <div className="text-xs font-semibold text-[#536158]">框架判断</div>
                <ul className="mt-2 grid gap-1 text-xs leading-5 text-[#536158]">
                  {plan.framework_trace.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mt-3 text-sm leading-6 text-[#536158]">
              <MarkdownBlock compact content={plan.reasoning || "Hermes 未返回 reasoning；需要回到 Skill output_contract 中补强该字段。"} />
            </div>
            {plan.quality_warnings?.length ? (
              <div className="mt-3 rounded-md border border-[#f0d8a8] bg-[#fff8ed] p-3 text-sm text-[#8a5b16]">
                <div className="font-semibold">计划自检</div>
                <ul className="mt-2 grid gap-1">
                  {plan.quality_warnings.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {plan.risk_notes?.length ? (
              <div className="mt-3 text-sm text-[#8a5b16]">风险提醒：{plan.risk_notes.join(" / ")}</div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
