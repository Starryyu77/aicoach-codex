"use client";

import { useEffect, useState } from "react";
import { confirmMemory, refreshMemory, refreshMemoryOnLeave } from "../lib/api";

type MemoryDisplayItem = {
  label: string;
  detail?: string;
  source?: string;
  priority?: "normal" | "notice" | "risk";
};

type MemoryDisplaySection = {
  id: string;
  title: string;
  description: string;
  items: MemoryDisplayItem[];
};

type MemoryDisplay = {
  updated_at: string;
  refresh_reason: string;
  headline: string;
  source_counts: {
    training_cards: number;
    pending_updates: number;
    confirmed_updates: number;
    observations: number;
  };
  sections: MemoryDisplaySection[];
  suggested_actions: string[];
};

export function MemoryPanel() {
  const [memory, setMemory] = useState<any>();
  const [status, setStatus] = useState("正在整理展示层...");

  async function refresh(reason = "manual") {
    setStatus("正在整理展示层...");
    const next = await refreshMemory(reason);
    setMemory(next);
    setStatus("展示层已更新");
  }

  useEffect(() => {
    refresh("page_open").catch(() => setStatus("展示层更新失败，请确认 Gateway 正在运行。"));
    const leave = () => refreshMemoryOnLeave("page_leave");
    const visibility = () => {
      if (document.visibilityState === "hidden") leave();
    };
    window.addEventListener("pagehide", leave);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      leave();
      window.removeEventListener("pagehide", leave);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  async function confirm(id: string) {
    await confirmMemory(id);
    await refresh();
  }

  const display = memory?.display as MemoryDisplay | undefined;

  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Memory 展示层</h1>
          <p className="mt-2 text-sm text-[#536158]">展示层会在进入和离开页面时整理最近训练、风险、偏好和待确认记忆；长期 Memory 仍需用户确认后写入。</p>
        </div>
        <button className="rounded-md bg-[#195b46] px-3 py-2 text-sm font-medium text-white" onClick={() => refresh("manual")}>
          立即整理
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-[#dfe6dc] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#607065]">Dynamic Snapshot</div>
            <h2 className="mt-1 text-xl font-semibold">{display?.headline || "暂无展示快照"}</h2>
            <p className="mt-2 text-sm text-[#536158]">{status}</p>
          </div>
          <div className="text-right text-xs text-[#536158]">
            <div>{display?.updated_at ? `更新：${new Date(display.updated_at).toLocaleString()}` : "尚未更新"}</div>
            <div>{display?.refresh_reason ? `触发：${display.refresh_reason}` : ""}</div>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <Metric label="训练卡" value={display?.source_counts.training_cards || 0} />
          <Metric label="待确认" value={display?.source_counts.pending_updates || 0} />
          <Metric label="已确认" value={display?.source_counts.confirmed_updates || 0} />
          <Metric label="观察" value={display?.source_counts.observations || 0} />
        </div>
        {display?.suggested_actions?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {display.suggested_actions.map((action) => (
              <span className="rounded-full border border-[#d7e1d6] bg-[#f7faf5] px-3 py-1 text-xs text-[#536158]" key={action}>{action}</span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(display?.sections || []).map((section) => (
          <DisplaySection section={section} key={section.id} />
        ))}
      </div>

      <div className="mt-4 rounded-lg bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">待确认 Memory 更新</h2>
        <div className="mt-3 grid gap-3">
          {(memory?.pending_updates || []).map((item: any) => (
            <div className="rounded-md border border-[#e0e7df] p-3" key={item.id}>
              <div className="text-sm font-medium">{item.content}</div>
              <div className="mt-1 text-xs text-[#536158]">{item.reason}</div>
              <button className="mt-3 rounded-md bg-[#1f7a5a] px-3 py-2 text-sm text-white" onClick={() => confirm(item.id)}>
                确认写入 Hermes Memory
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-[#f4f7f2] p-3">
      <div className="text-xs text-[#536158]">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function DisplaySection({ section }: { section: MemoryDisplaySection }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-[#1f7a5a]">{section.title}</h2>
      <p className="mt-1 text-xs leading-5 text-[#536158]">{section.description}</p>
      <div className="mt-4 grid gap-3">
        {section.items.length ? section.items.map((item, index) => (
          <div className="rounded-md border border-[#e0e7df] p-3" key={`${item.label}-${index}`}>
            <div className={item.priority === "risk" ? "text-sm font-medium text-[#9b2f2f]" : item.priority === "notice" ? "text-sm font-medium text-[#8a5b16]" : "text-sm font-medium text-[#17201b]"}>
              {item.label}
            </div>
            {item.detail ? <div className="mt-1 text-xs leading-5 text-[#536158]">{item.detail}</div> : null}
            {item.source ? <div className="mt-2 font-mono text-[11px] text-[#708077]">{item.source}</div> : null}
          </div>
        )) : (
          <div className="rounded-md border border-dashed border-[#d8e1d8] p-3 text-sm text-[#536158]">暂无可展示内容。</div>
        )}
      </div>
    </div>
  );
}
