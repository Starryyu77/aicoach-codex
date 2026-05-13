"use client";

import { useMemo, useState } from "react";
import { assessMovement, endSession, sendChat, startSession } from "../lib/api";
import type { PlanCard } from "../lib/types";
import { CameraInputButton } from "./CameraInputButton";
import { ChatPanel } from "./ChatPanel";
import { CurrentExerciseCard } from "./CurrentExerciseCard";
import { CurrentPlanCard } from "./CurrentPlanCard";
import { QuickActionBar } from "./QuickActionBar";
import { VoiceInputButton } from "./VoiceInputButton";

const DEFAULT_ACTIONS = [
  "完成本组",
  "太轻了",
  "太重了",
  "感觉不到目标肌肉",
  "有点累",
  "有点疼",
  "器械被占用",
  "换动作",
  "打开摄像头",
  "结束训练"
];

export function TrainingCockpit() {
  const [plan, setPlan] = useState<PlanCard | undefined>();
  const [currentExercise, setCurrentExercise] = useState("高位下拉");
  const [messages, setMessages] = useState<Array<{ role: "user" | "agent"; text: string }>>([]);
  const [quickActions, setQuickActions] = useState(DEFAULT_ACTIONS);
  const [riskNote, setRiskNote] = useState("肩前侧偶尔紧：上肢动作前先热身，疼痛时停止相关动作。");
  const [isBusy, setBusy] = useState(false);

  const currentItem = useMemo(() => {
    return plan?.sections.flatMap((section) => section.items).find((item) => item.exercise === currentExercise)
      || plan?.sections.flatMap((section) => section.items)[0];
  }, [plan, currentExercise]);

  async function submit(text: string, source: "text" | "quick_action" = "text") {
    setBusy(true);
    setMessages((items) => [...items, { role: "user", text }]);
    try {
      if (text === "结束训练") {
        const response = await endSession();
        setMessages((items) => [...items, { role: "agent", text: response.ui.chat_message }]);
        return;
      }
      const response = await sendChat(text, source);
      if (response.ui.current_plan) setPlan(response.ui.current_plan);
      if (response.ui.current_session?.current_exercise) setCurrentExercise(response.ui.current_session.current_exercise);
      if (response.ui.quick_actions) setQuickActions(response.ui.quick_actions);
      if (response.ui.memory_updates?.length) setRiskNote("有新的 Memory 更新候选，需用户确认后写入 Hermes Memory。");
      setMessages((items) => [...items, { role: "agent", text: response.ui.chat_message }]);
    } finally {
      setBusy(false);
    }
  }

  async function initialize() {
    await startSession();
    await submit("今天该练什么？");
  }

  async function runCamera() {
    setBusy(true);
    const response = await assessMovement(currentExercise || "高位下拉");
    setMessages((items) => [
      ...items,
      { role: "user", text: `摄像头检查：${currentExercise}` },
      { role: "agent", text: response.ui.chat_message }
    ]);
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-[#f4f7f2] p-4 text-[#17201b] md:p-6">
      <section className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <header className="col-span-full rounded-lg bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{plan?.title || "Training Cockpit"}</h1>
              <p className="mt-1 text-sm text-[#536158]">{plan?.goal || "Hermes + Road to Summer 训练驾驶舱"}</p>
            </div>
            <button className="rounded-md bg-[#1f7a5a] px-4 py-2 text-sm font-medium text-white" onClick={initialize}>
              生成今日计划
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md bg-[#f4f7f2] p-3">
              <div className="text-xs text-[#536158]">当前目标</div>
              <div className="mt-1 font-medium">{plan?.goal || "待生成"}</div>
            </div>
            <div className="rounded-md bg-[#f4f7f2] p-3">
              <div className="text-xs text-[#536158]">当前动作</div>
              <div className="mt-1 font-medium">{currentItem?.exercise || currentExercise}</div>
            </div>
            <div className="rounded-md bg-[#fff8ed] p-3">
              <div className="text-xs text-[#8a5b16]">风险提醒</div>
              <div className="mt-1 text-sm">{riskNote}</div>
            </div>
          </div>
        </header>

        <div className="grid gap-4">
          <CurrentPlanCard plan={plan} />
          <CurrentExerciseCard item={currentItem} />
        </div>

        <div className="grid gap-4">
          <ChatPanel messages={messages} onSubmit={(text) => submit(text)} isBusy={isBusy} />
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <VoiceInputButton onTranscript={(text) => submit(text, "text")} />
              <CameraInputButton onClick={runCamera} />
            </div>
            <QuickActionBar actions={quickActions} onAction={(action) => submit(action, "quick_action")} />
          </div>
        </div>
      </section>
    </main>
  );
}

