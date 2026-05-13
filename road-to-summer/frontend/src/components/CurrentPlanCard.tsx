import type { PlanCard, PlanItem } from "../lib/types";

function isPlanItem(item: PlanItem | string): item is PlanItem {
  return typeof item === "object" && item !== null && "exercise" in item;
}

function itemLabel(item: PlanItem | string) {
  return isPlanItem(item) ? item.exercise : item;
}

export function CurrentPlanCard({ plan }: { plan?: PlanCard }) {
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">当前计划</h2>
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
                      <div className="border-b border-[#e0e7df] p-3 text-sm text-[#536158] last:border-b-0" key={key}>
                        {item}
                      </div>
                    );
                  }
                  return (
                    <div className="grid gap-2 border-b border-[#e0e7df] p-3 last:border-b-0 md:grid-cols-[1.1fr_0.8fr_1fr]" key={key}>
                      <div className="font-medium">{item.exercise}</div>
                      <div className="text-sm text-[#536158]">{item.sets || "-"} x {item.reps || "-"} · {item.intensity || "-"}</div>
                      <div className="text-sm text-[#536158]">休息 {item.rest || "-"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="text-sm text-[#536158]">{plan.reasoning}</p>
        </div>
      )}
    </section>
  );
}
