"use client";

import { useEffect, useState } from "react";
import { deleteHistoryCard, getCurrentSession, getHistory } from "../lib/api";
import type { SessionSnapshot, TrainingCard } from "../lib/types";
import { TrainingCardView } from "./TrainingCardView";

export function TrainingHistoryList() {
  const [cards, setCards] = useState<TrainingCard[]>([]);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | undefined>();

  useEffect(() => {
    getHistory().then((data) => setCards(data as TrainingCard[])).catch(() => setCards([]));
    getCurrentSession().then(setSnapshot).catch(() => setSnapshot(undefined));
  }, []);

  async function remove(card: TrainingCard) {
    if (!card.id) return;
    const confirmed = window.confirm(`删除这张训练卡片？\n\n${card.theme}\n${card.storage_path || ""}`);
    if (!confirmed) return;
    await deleteHistoryCard(card.id);
    setCards((items) => items.filter((item) => item.id !== card.id));
  }

  return (
    <section className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">历史训练卡片</h1>
      <div className="mt-3 rounded-lg border border-[#dfe6dc] bg-white p-4 text-sm text-[#536158] shadow-sm">
        结构化训练记录保存目录：
        <span className="ml-2 font-mono text-xs text-[#26332b]">
          {snapshot?.storage?.training_cards_dir || "Gateway 未返回保存目录，请确认 /session/current 可用。"}
        </span>
      </div>
      <div className="mt-4 grid gap-4">
        {cards.length === 0 ? (
          <div className="rounded-lg bg-white p-5 text-sm text-[#536158] shadow-sm">还没有训练卡片。结束一次训练后会出现在这里。</div>
        ) : cards.map((card) => <TrainingCardView card={card} key={card.id || `${card.date}-${card.theme}`} onDelete={remove} />)}
      </div>
    </section>
  );
}
