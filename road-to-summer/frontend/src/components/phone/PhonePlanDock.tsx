"use client";

import type { OfficialSourceTrace, PlanCard, PlanItem, PlanSection, SessionSnapshot } from "../../lib/types";

function isPlanItem(item: PlanItem | string): item is PlanItem {
  return typeof item === "object" && item !== null && "exercise" in item;
}

function itemKey(section: PlanSection, item: PlanItem | string, index: number) {
  if (isPlanItem(item) && item.item_id) return item.item_id;
  return `${section.section_id || section.name}-${index}-${isPlanItem(item) ? item.exercise : item}`;
}

function safeSections(plan: PlanCard): PlanSection[] {
  return Array.isArray(plan.sections) ? plan.sections : [];
}

function safeItems(section: PlanSection): Array<PlanItem | string> {
  return Array.isArray(section.items) ? section.items : [];
}

function sourceTraceKey(source: OfficialSourceTrace, index: number) {
  return `${source.framework || source.official_source || "source"}-${index}`;
}

type PhonePlanDockProps = {
  plan?: PlanCard;
  currentItem?: PlanItem;
  session?: SessionSnapshot;
  isExpanded: boolean;
  isBusy: boolean;
  isTrainingActive: boolean;
  isEnded: boolean;
  onToggleExpanded: () => void;
  onStartTraining: () => void;
};

export function PhonePlanDock({
  plan,
  currentItem,
  session,
  isExpanded,
  isBusy,
  isTrainingActive,
  isEnded,
  onToggleExpanded,
  onStartTraining
}: PhonePlanDockProps) {
  if (!plan) return null;
  const sections = safeSections(plan);
  const frameworkTrace = Array.isArray(plan.framework_trace) ? plan.framework_trace.filter(Boolean).slice(0, 5) : [];
  const officialSourceTrace = Array.isArray(plan.official_source_trace) ? plan.official_source_trace.filter((source) => source.framework || source.official_source).slice(0, 5) : [];

  const className = [
    "rts-phone-plan-dock",
    isExpanded ? "rts-phone-plan-dock--expanded" : "",
    isTrainingActive ? "rts-phone-plan-dock--training" : ""
  ].filter(Boolean).join(" ");

  return (
    <aside className={className} aria-label="当前计划">
      <div className="rts-phone-plan-head">
        <div>
          <p>当前计划</p>
          <h2>{plan.title || "训练计划"}</h2>
        </div>
        <div className="rts-phone-plan-actions">
          <button type="button" onClick={onToggleExpanded}>
            {isExpanded ? "收起" : "展开"}
          </button>
          <button type="button" disabled={isBusy || isTrainingActive || isEnded} onClick={onStartTraining}>
            {isTrainingActive ? "训练中" : isEnded ? "已结束" : "开始"}
          </button>
        </div>
      </div>

      <div className="rts-phone-current-action">
        <span>当前动作</span>
        <strong>{currentItem?.exercise || session?.current_exercise || "待开始"}</strong>
        <small>{session?.progress || `${plan.duration || "时长待定"} · ${plan.goal || "目标待定"}`}</small>
      </div>

      {isExpanded ? (
        <div className="rts-phone-plan-body">
          <p className="rts-phone-plan-reason">{plan.reasoning || plan.goal || "计划详情待补充。"}</p>
          <div className="rts-phone-plan-meta">
            <span>{plan.target_date || "训练日期待定"}</span>
            <span>{plan.duration || "时长待定"}</span>
            <span>{sections.length} 模块</span>
          </div>
          <div className="rts-phone-plan-sections">
            {sections.map((section) => (
              <section key={section.section_id || section.name}>
                <h3>{section.name || "训练模块"}</h3>
                {safeItems(section).map((item, index) =>
                  isPlanItem(item) ? (
                    <div className="rts-phone-plan-item" key={itemKey(section, item, index)}>
                      <div>
                        <strong>{item.exercise}</strong>
                        <small>{item.cue || item.selection_reason || "按计划执行，训练中可随时调整。"}</small>
                        {item.source_note ? <small className="rts-phone-source-note">{item.source_note}</small> : null}
                      </div>
                      <span>{item.sets} x {item.reps}</span>
                    </div>
                  ) : (
                    <p className="rts-phone-plan-note" key={itemKey(section, item, index)}>
                      {item}
                    </p>
                  )
                )}
              </section>
            ))}
          </div>
          {Array.isArray(plan.risk_notes) && plan.risk_notes.length ? (
            <div className="rts-phone-risk-strip">风险提醒：{plan.risk_notes.join(" / ")}</div>
          ) : null}
          {frameworkTrace.length || officialSourceTrace.length ? (
            <div className="rts-phone-source-panel">
              <h3>依据</h3>
              {frameworkTrace.length ? (
                <div className="rts-phone-framework-trace">
                  {frameworkTrace.map((trace) => <span key={trace}>{trace}</span>)}
                </div>
              ) : null}
              {officialSourceTrace.length ? (
                <div className="rts-phone-official-sources" aria-label="官方来源">
                  {officialSourceTrace.map((source, index) => (
                    <a
                      href={source.source_url}
                      key={sourceTraceKey(source, index)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <strong>{source.framework || source.official_source}</strong>
                      <small>{source.official_source || source.model}</small>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
