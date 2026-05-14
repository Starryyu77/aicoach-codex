"use client";

import { useEffect, useMemo, useState } from "react";
import { assessMovement, endSession, getCurrentSession, sendChat, startSession } from "../lib/api";
import type { PlanCard, PlanItem, SessionSnapshot } from "../lib/types";
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

const DEFAULT_TIMEZONE = "Asia/Singapore";
const DAY_MS = 24 * 60 * 60 * 1000;

function todayInTimezone(timezone = DEFAULT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day) + days * DAY_MS);
  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, "0"),
    String(next.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function dateLabel(date: string, today: string) {
  const [fromYear, fromMonth, fromDay] = today.split("-").map(Number);
  const [toYear, toMonth, toDay] = date.split("-").map(Number);
  const offset = Math.round((Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) / DAY_MS);
  if (offset === -2) return "前天";
  if (offset === -1) return "昨天";
  if (offset === 0) return "今天";
  if (offset === 1) return "明天";
  if (offset === 2) return "后天";
  if (offset < 0) return `${Math.abs(offset)} 天前`;
  return `${offset} 天后`;
}

function isPlanItem(item: PlanItem | string): item is PlanItem {
  return typeof item === "object" && item !== null && "exercise" in item;
}

export function TrainingCockpit() {
  const [plan, setPlan] = useState<PlanCard | undefined>();
  const [currentExercise, setCurrentExercise] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "agent"; text: string }>>([]);
  const [quickActions, setQuickActions] = useState(DEFAULT_ACTIONS);
  const [riskNote, setRiskNote] = useState("肩前侧偶尔紧：上肢动作前先热身，疼痛时停止相关动作。");
  const [isBusy, setBusy] = useState(false);
  const [session, setSession] = useState<SessionSnapshot | undefined>();
  const [statusText, setStatusText] = useState("未开始：先确认今天状态，再手动生成计划。");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [targetDate, setTargetDate] = useState(() => todayInTimezone(DEFAULT_TIMEZONE));

  function mergeSession(next: SessionSnapshot) {
    setSession((previous) => ({
      ...previous,
      ...next,
      storage: next.storage || previous?.storage
    }));
  }

  const currentItem = useMemo(() => {
    const planItems = plan?.sections.flatMap((section) => section.items).filter(isPlanItem) || [];
    return planItems.find((item) => item.exercise === currentExercise) || planItems[0];
  }, [plan, currentExercise]);

  useEffect(() => {
    getCurrentSession()
      .then((snapshot) => {
        mergeSession(snapshot);
        const savedPlan = snapshot.current_plan || snapshot.plan_card;
        if (savedPlan) {
          setPlan(savedPlan);
          setStatusText("已从本地 Gateway 状态恢复当前训练。");
        }
        if (snapshot.current_exercise) setCurrentExercise(snapshot.current_exercise);
        if (snapshot.timezone) setTimezone(snapshot.timezone);
        if (snapshot.target_date || snapshot.time_context?.target_date) {
          setTargetDate(snapshot.target_date || snapshot.time_context?.target_date || todayInTimezone(DEFAULT_TIMEZONE));
        }
      })
      .catch(() => {
        setStatusText("未连接到 Gateway：请确认 npm run gateway 正在运行。");
      });
  }, []);

  async function submit(text: string, source: "text" | "voice" | "quick_action" = "text") {
    setBusy(true);
    setMessages((items) => [...items, { role: "user", text }]);
    try {
      if (text === "结束训练") {
        const response = await endSession({ targetDate, timezone });
        setMessages((items) => [...items, { role: "agent", text: response.ui.chat_message }]);
        return;
      }
      const response = await sendChat(text, source, { targetDate, timezone });
      if (response.ui.current_plan) setPlan(response.ui.current_plan);
      if (response.ui.current_session) {
        mergeSession(response.ui.current_session);
        if (response.ui.current_session.current_exercise) setCurrentExercise(response.ui.current_session.current_exercise);
        if (response.ui.current_session.target_date) setTargetDate(response.ui.current_session.target_date);
        if (response.ui.current_session.timezone) setTimezone(response.ui.current_session.timezone);
      }
      if (response.ui.quick_actions) setQuickActions(response.ui.quick_actions);
      if (response.ui.memory_updates?.length) setRiskNote("有新的 Memory 更新候选，需用户确认后写入 Hermes Memory。");
      setMessages((items) => [...items, { role: "agent", text: response.ui.chat_message }]);
    } finally {
      setBusy(false);
    }
  }

  async function initialize() {
    const started = await startSession({ targetDate, timezone });
    mergeSession(started as SessionSnapshot);
    const label = dateLabel(targetDate, todayInTimezone(timezone));
    setStatusText(`训练 session 已开始，正在请求 Hermes 生成 ${label}（${targetDate}）的计划。`);
    await submit(`请按 ${targetDate} 生成训练计划。`);
  }

  async function runCamera() {
    if (!currentItem && !currentExercise) {
      setMessages((items) => [...items, { role: "agent", text: "先生成或恢复一个训练计划，再打开摄像头检查具体动作。" }]);
      return;
    }
    setBusy(true);
    const targetExercise = currentExercise || currentItem?.exercise || "高位下拉";
    const response = await assessMovement(targetExercise);
    setMessages((items) => [
      ...items,
      { role: "user", text: `摄像头检查：${targetExercise}` },
      { role: "agent", text: response.ui.chat_message }
    ]);
    if (response.ui.current_plan) setPlan(response.ui.current_plan);
    if (response.ui.current_session?.current_exercise) setCurrentExercise(response.ui.current_session.current_exercise);
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-[#eef2ec] p-4 text-[#17201b] md:p-6">
      <section className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <header className="col-span-full rounded-lg border border-[#dfe6dc] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#607065]">Road to Summer / Hermes</div>
              <h1 className="mt-1 text-2xl font-semibold">{plan?.title || "训练驾驶舱"}</h1>
              <p className="mt-1 text-sm text-[#536158]">{plan?.goal || "不会自动生成计划。先开始 session，再由 Hermes 生成结构化训练卡。"}</p>
            </div>
            <button className="rounded-md bg-[#195b46] px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={isBusy} onClick={initialize}>
              {plan ? "重新生成今日计划" : "生成今日计划"}
            </button>
          </div>
          <div className="mt-4 rounded-md border border-[#dfe6dc] bg-[#f7faf5] px-3 py-2 text-sm text-[#536158]">
            {statusText}
            {session?.storage?.current_plan ? <span className="ml-2 font-mono text-xs">current_plan: {session.storage.current_plan}</span> : null}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-md border border-[#dfe6dc] bg-[#f7faf5] p-3">
              <div className="flex flex-wrap items-end gap-3">
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-[#536158]">训练目标日期</span>
                  <input
                    className="h-10 rounded-md border border-[#cfd9cf] bg-white px-3 text-sm font-medium"
                    type="date"
                    value={targetDate}
                    onChange={(event) => {
                      if (event.target.value) setTargetDate(event.target.value);
                    }}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["今天", 0],
                    ["明天", 1],
                    ["前天", -2]
                  ].map(([label, offset]) => (
                    <button
                      className="h-9 rounded-md border border-[#cfd9cf] bg-white px-3 text-sm text-[#314037]"
                      key={label}
                      type="button"
                      onClick={() => setTargetDate(addDays(todayInTimezone(timezone), Number(offset)))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-[#536158]">
                  当前按 {dateLabel(targetDate, todayInTimezone(timezone))} 处理，时区 {timezone}
                </div>
              </div>
            </div>
            <div className="rounded-md border border-[#dfe6dc] bg-white p-3 text-sm text-[#536158]">
              <div className="font-medium text-[#17201b]">时间规则</div>
              <div className="mt-1">补前天记录会保存到对应日期；讨论明天训练会生成未来计划，不会写成已完成训练。</div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-md bg-[#f4f7f2] p-3">
              <div className="text-xs text-[#536158]">当前目标</div>
              <div className="mt-1 font-medium">{plan?.goal || "待生成"}</div>
            </div>
            <div className="rounded-md bg-[#f4f7f2] p-3">
              <div className="text-xs text-[#536158]">当前动作</div>
              <div className="mt-1 font-medium">{currentItem?.exercise || currentExercise || "待生成"}</div>
            </div>
            <div className="rounded-md bg-[#f4f7f2] p-3">
              <div className="text-xs text-[#536158]">目标日期</div>
              <div className="mt-1 font-medium">{plan?.target_date || targetDate}</div>
              <div className="mt-1 text-xs text-[#536158]">{plan?.date_label || dateLabel(targetDate, todayInTimezone(timezone))}</div>
            </div>
            <div className="rounded-md bg-[#fff8ed] p-3">
              <div className="text-xs text-[#8a5b16]">风险提醒</div>
              <div className="mt-1 text-sm">{riskNote}</div>
            </div>
          </div>
        </header>

        <div className="grid gap-4">
          <CurrentPlanCard plan={plan} storagePath={session?.storage?.current_plan} />
          <CurrentExerciseCard item={currentItem} />
        </div>

        <div className="grid gap-4">
          <ChatPanel messages={messages} onSubmit={(text) => submit(text)} isBusy={isBusy} />
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <VoiceInputButton onTranscript={(text) => submit(text, "voice")} />
              <CameraInputButton onClick={runCamera} />
            </div>
            <QuickActionBar actions={quickActions} onAction={(action) => submit(action, "quick_action")} />
          </div>
        </div>
      </section>
    </main>
  );
}
