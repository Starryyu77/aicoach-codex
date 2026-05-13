"use client";

import { useEffect, useState } from "react";
import { getHistory } from "../lib/api";
import type { TrainingCard } from "../lib/types";
import { TrainingCardView } from "./TrainingCardView";

export function TrainingHistoryList() {
  const [cards, setCards] = useState<TrainingCard[]>([]);

  useEffect(() => {
    getHistory().then((data) => setCards(data as TrainingCard[])).catch(() => setCards([]));
  }, []);

  return (
    <section className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">历史训练卡片</h1>
      <div className="mt-4 grid gap-4">
        {cards.length === 0 ? (
          <div className="rounded-lg bg-white p-5 text-sm text-[#536158] shadow-sm">还没有训练卡片。结束一次训练后会出现在这里。</div>
        ) : cards.map((card) => <TrainingCardView card={card} key={card.id || `${card.date}-${card.theme}`} />)}
      </div>
    </section>
  );
}

