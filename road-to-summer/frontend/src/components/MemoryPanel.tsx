"use client";

import { useEffect, useState } from "react";
import { confirmMemory, getMemory } from "../lib/api";

export function MemoryPanel() {
  const [memory, setMemory] = useState<any>();

  async function refresh() {
    setMemory(await getMemory());
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  async function confirm(id: string) {
    await confirmMemory(id);
    await refresh();
  }

  return (
    <section className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Memory 展示层</h1>
      <p className="mt-2 text-sm text-[#536158]">第一版只展示 Hermes Memory 或 mock memory，不自研复杂 Memory 系统。</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Panel title="训练目标" value={memory?.user_goal} />
        <Panel title="训练偏好" value={memory?.preferences} />
        <Panel title="场地记忆" value={memory?.locations} />
        <Panel title="器械记忆" value={memory?.equipment} />
        <Panel title="风险记忆" value={memory?.risks} />
        <Panel title="近期观察" value={memory?.observations} />
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

function Panel({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-[#1f7a5a]">{title}</h2>
      <pre className="mt-3 whitespace-pre-wrap text-sm">{JSON.stringify(value || [], null, 2)}</pre>
    </div>
  );
}

