"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  assessMovement,
  endSession,
  getCurrentSession,
  getHermesRuntime,
  resetSession,
  sendChat,
  startSession
} from "../../lib/api";
import type { AgentUiDocument, ChatMessage, PlanCard, PlanItem, SessionSnapshot } from "../../lib/types";
import { canOpenCameraForTraining, normalizePhoneActions } from "../../lib/phoneSafety";
import { CameraInputButton } from "../CameraInputButton";
import { MusclePicker } from "./muscle-picker/MusclePicker";
import { formatMuscleSelection, type MuscleKey } from "./muscle-picker/muscle-types";
import { PhoneComposer } from "./PhoneComposer";
import { PhoneHeader } from "./PhoneHeader";
import { PhonePlanDock } from "./PhonePlanDock";
import { PhoneShell } from "./PhoneShell";
import { PhoneThread } from "./PhoneThread";

const DEFAULT_ACTIONS = [
  "完成本组",
  "太轻了",
  "太重了",
  "感觉不到目标肌肉",
  "有点累",
  "有点疼",
  "器械被占用",
  "换动作",
  "结束训练"
];

const DEFAULT_TIMEZONE = "Asia/Singapore";
const ACTIVE_SESSION_PHASES = new Set(["training", "in_session", "warmup", "main", "accessory", "cooldown"]);
const ENDED_SESSION_PHASES = new Set(["ended", "completed"]);

function isPlanItem(item: PlanItem | string): item is PlanItem {
  return typeof item === "object" && item !== null && "exercise" in item;
}

function safePlanItems(plan?: PlanCard): Array<PlanItem | string> {
  return (Array.isArray(plan?.sections) ? plan.sections : [])
    .flatMap((section) => (Array.isArray(section.items) ? section.items : []));
}

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

function friendlyErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/timed out|timeout|aborted/i.test(message)) {
    return "这次生成等得太久，我先保留当前训练状态。你可以稍后重试，或者先按当前计划继续训练。";
  }
  return `请求失败：${message}`;
}

function isActiveSessionPhase(phase?: string) {
  return Boolean(phase && ACTIVE_SESSION_PHASES.has(phase));
}

function isEndedSessionPhase(phase?: string) {
  return Boolean(phase && ENDED_SESSION_PHASES.has(phase));
}

function visibleChatMessages(messages?: ChatMessage[]): Array<{ role: "user" | "agent"; text: string }> {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => (message.role === "user" || message.role === "agent") && Boolean(message.text?.trim()))
    .map((message) => ({ role: message.role, text: message.text }));
}

export function PhoneTrainingCockpit() {
  const finishInFlightRef = useRef(false);
  const [plan, setPlan] = useState<PlanCard | undefined>();
  const [messages, setMessages] = useState<Array<{ role: "user" | "agent"; text: string }>>([]);
  const [quickActions, setQuickActions] = useState(DEFAULT_ACTIONS);
  const [riskNote, setRiskNote] = useState("肩前侧偶尔紧：上肢动作前先热身，疼痛时停止相关动作。");
  const [isBusy, setBusy] = useState(false);
  const [session, setSession] = useState<SessionSnapshot | undefined>();
  const [agentUi, setAgentUi] = useState<AgentUiDocument | undefined>();
  const [statusText, setStatusText] = useState("未开始：先选择具体日期，再生成计划。");
  const [modelStatus, setModelStatus] = useState("模型状态读取中");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [targetDate, setTargetDate] = useState(() => todayInTimezone(DEFAULT_TIMEZONE));
  const [input, setInput] = useState("");
  const [isPlanExpanded, setPlanExpanded] = useState(false);
  const [isQuickMenuOpen, setQuickMenuOpen] = useState(false);
  const [isToolPanelOpen, setToolPanelOpen] = useState(false);
  const [isMusclePickerOpen, setMusclePickerOpen] = useState(false);
  const [selectedMuscles, setSelectedMuscles] = useState<MuscleKey[]>([]);

  function mergeSession(next: SessionSnapshot) {
    setSession((previous) => ({
      ...previous,
      ...next,
      storage: next.storage || previous?.storage
    }));
  }

  const currentItem = useMemo(() => {
    const planItems = safePlanItems(plan).filter(isPlanItem);
    return planItems.find((item) => item.item_id && item.item_id === session?.current_item_id) ||
      planItems.find((item) => item.exercise === session?.current_exercise) ||
      planItems[0];
  }, [plan, session?.current_exercise, session?.current_item_id]);

  useEffect(() => {
    getCurrentSession()
      .then((snapshot) => {
        mergeSession(snapshot);
        const savedPlan = snapshot.current_plan || snapshot.plan_card;
        if (savedPlan) {
          setPlan(savedPlan);
          setStatusText("已从 Gateway 恢复当前训练。");
        }
        if (snapshot.timezone) setTimezone(snapshot.timezone);
        if (snapshot.chat_messages) setMessages(visibleChatMessages(snapshot.chat_messages));
        if (snapshot.target_date || snapshot.time_context?.target_date) {
          setTargetDate(snapshot.target_date || snapshot.time_context?.target_date || todayInTimezone(DEFAULT_TIMEZONE));
        }
      })
      .catch(() => {
        setStatusText("未连接到 Gateway：请确认 gateway 正在运行。");
      });

    getHermesRuntime()
      .then((runtime) => {
        const keyState = runtime.hasApiKey ? "已配置" : "未配置 key";
        setModelStatus(`${runtime.provider} · ${runtime.model} · ${keyState}`);
      })
      .catch(() => {
        setModelStatus("Gateway 未连接");
      });
  }, []);

  async function submit(text: string, source: "text" | "voice" | "quick_action" = "text") {
    if (!text.trim() || isBusy) return;
    if (text === "结束训练") {
      await finishTraining();
      return;
    }

    setBusy(true);
    setQuickMenuOpen(false);
    setInput("");
    setMessages((items) => [...items, { role: "user", text }]);
    try {
      const response = await sendChat(text, source, { targetDate, timezone });
      if (response.ui.current_plan) {
        setPlan(response.ui.current_plan);
      }
      if (response.ui.agent_ui) setAgentUi(response.ui.agent_ui);
      let syncedMessages = false;
      if (response.ui.current_session) {
        mergeSession(response.ui.current_session);
        if (response.ui.current_session.chat_messages) {
          setMessages(visibleChatMessages(response.ui.current_session.chat_messages));
          syncedMessages = true;
        }
        if (response.ui.current_session.target_date) setTargetDate(response.ui.current_session.target_date);
        if (response.ui.current_session.timezone) setTimezone(response.ui.current_session.timezone);
      }
      if (response.ui.quick_actions) setQuickActions(normalizePhoneActions(response.ui.quick_actions, DEFAULT_ACTIONS));
      if (response.ui.memory_updates?.length) {
        setRiskNote("有新的长期记忆候选，需用户确认后再写入 Hermes Memory。");
      }
      if (!syncedMessages) setMessages((items) => [...items, { role: "agent", text: response.ui.chat_message }]);
      setStatusText("Hermes 已更新训练状态。");
    } catch (error) {
      const message = friendlyErrorMessage(error);
      setStatusText(message);
      setMessages((items) => [...items, { role: "agent", text: message }]);
    } finally {
      setBusy(false);
    }
  }

  async function initialize() {
    setBusy(true);
    try {
      const started = await startSession({ targetDate, timezone });
      mergeSession(started as SessionSnapshot);
      setStatusText(`训练 session 已开始，正在生成 ${targetDate} 的计划。`);
      setBusy(false);
      await submit(`请按 ${targetDate} 生成训练计划。`);
    } catch (error) {
      const message = friendlyErrorMessage(error);
      setStatusText(message);
      setMessages((items) => [...items, { role: "agent", text: message }]);
      setBusy(false);
    }
  }

  async function finishTraining() {
    if (finishInFlightRef.current || isBusy) return;
    finishInFlightRef.current = true;
    setBusy(true);
    setQuickMenuOpen(false);
    try {
      const response = await endSession({ targetDate, timezone });
      if (response.ui.agent_ui) setAgentUi(response.ui.agent_ui);
      if (response.ui.current_plan) setPlan(response.ui.current_plan);
      let syncedMessages = false;
      if (response.ui.current_session) {
        mergeSession(response.ui.current_session);
        if (response.ui.current_session.chat_messages) {
          setMessages(visibleChatMessages(response.ui.current_session.chat_messages));
          syncedMessages = true;
        }
      }
      if (response.ui.training_card) {
        setStatusText(`训练已保存：${response.ui.training_card.date} · ${response.ui.training_card.theme}`);
        setPlan(undefined);
        setPlanExpanded(false);
      } else {
        setStatusText("训练已结束，等待训练卡片保存状态。");
      }
      if (!syncedMessages) {
        setMessages((items) => [
          ...items,
          { role: "user", text: "结束训练" },
          { role: "agent", text: response.ui.chat_message }
        ]);
      }
    } catch (error) {
      const message = friendlyErrorMessage(error);
      setStatusText(message);
      setMessages((items) => [...items, { role: "agent", text: message }]);
    } finally {
      finishInFlightRef.current = false;
      setBusy(false);
    }
  }

  async function runCamera() {
    if (!canOpenCameraForTraining({
      hasPlan: Boolean(plan),
      hasCurrentTarget: Boolean(currentItem || session?.current_exercise),
      phase: session?.phase,
      isBusy
    })) {
      setMessages((items) => [...items, { role: "agent", text: "先生成或恢复一个训练计划，再打开摄像头检查具体动作。" }]);
      return;
    }
    setBusy(true);
    setToolPanelOpen(false);
    const targetExercise = currentItem?.exercise || session?.current_exercise || "当前动作";
    try {
      const response = await assessMovement(targetExercise);
      if (response.ui.agent_ui) setAgentUi(response.ui.agent_ui);
      if (response.ui.current_plan) setPlan(response.ui.current_plan);
      if (response.ui.current_session) mergeSession(response.ui.current_session);
      setMessages((items) => [
        ...items,
        { role: "user", text: `摄像头检查：${targetExercise}` },
        { role: "agent", text: response.ui.chat_message }
      ]);
    } catch (error) {
      const message = friendlyErrorMessage(error);
      setStatusText(message);
      setMessages((items) => [...items, { role: "agent", text: message }]);
    } finally {
      setBusy(false);
    }
  }

  function toggleMuscle(muscle: MuscleKey) {
    setSelectedMuscles((current) =>
      current.includes(muscle)
        ? current.filter((selected) => selected !== muscle)
        : [...current, muscle]
    );
  }

  function toggleMusclePicker() {
    setMusclePickerOpen((open) => {
      const next = !open;
      if (next) {
        setQuickMenuOpen(false);
        setToolPanelOpen(false);
      }
      return next;
    });
  }

  async function confirmMuscles() {
    if (!selectedMuscles.length) return;
    const muscleText = formatMuscleSelection(selectedMuscles);
    setSelectedMuscles([]);
    setMusclePickerOpen(false);
    if (isEndedSessionPhase(session?.phase)) {
      setBusy(true);
      setStatusText("训练已结束，正在为新的肌群选择开启新对话...");
      try {
        const snapshot = await resetSession({ targetDate, timezone });
        setPlan(undefined);
        setMessages([]);
        setSession(undefined);
        setAgentUi(undefined);
        setPlanExpanded(false);
        mergeSession(snapshot);
        if (snapshot.timezone) setTimezone(snapshot.timezone);
        if (snapshot.target_date || snapshot.time_context?.target_date) {
          setTargetDate(snapshot.target_date || snapshot.time_context?.target_date || targetDate);
        }
      } catch (error) {
        const message = friendlyErrorMessage(error);
        setStatusText(`Gateway 重置失败，已保留当前界面状态：${message}`);
        setMessages((items) => [...items, { role: "agent", text: `Gateway 重置失败，当前界面状态已保留：${message}` }]);
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    await submit(`我想在 ${targetDate} 训练：${muscleText}。请根据这些部位生成训练计划。`);
  }

  async function resetLocalSession() {
    if (isBusy) return;
    const resetTargetDate = todayInTimezone(timezone);
    setBusy(true);
    setStatusText("正在开启新对话...");
    try {
      const snapshot = await resetSession({ targetDate: resetTargetDate, timezone });
      setPlan(undefined);
      setMessages([]);
      setSession(undefined);
      setAgentUi(undefined);
      setInput("");
      setPlanExpanded(false);
      setQuickMenuOpen(false);
      setMusclePickerOpen(false);
      setSelectedMuscles([]);
      setTargetDate(resetTargetDate);
      mergeSession(snapshot);
      if (snapshot.target_date || snapshot.time_context?.target_date) {
        setTargetDate(snapshot.target_date || snapshot.time_context?.target_date || targetDate);
      }
      if (snapshot.timezone) setTimezone(snapshot.timezone);
      setStatusText("已开启新对话。刷新后不会恢复上一段训练。");
    } catch (error) {
      const message = friendlyErrorMessage(error);
      setStatusText(`Gateway 重置失败，已保留当前界面状态：${message}`);
      setMessages((items) => [...items, { role: "agent", text: `Gateway 重置失败，当前界面状态已保留：${message}` }]);
    } finally {
      setBusy(false);
    }
  }

  const isTrainingActive = isActiveSessionPhase(session?.phase);
  const isEnded = isEndedSessionPhase(session?.phase);
  const canUseCamera = canOpenCameraForTraining({
    hasPlan: Boolean(plan),
    hasCurrentTarget: Boolean(currentItem || session?.current_exercise),
    phase: session?.phase,
    isBusy
  });
  const bottomPaddingMode = isMusclePickerOpen
    ? "normal"
    : isTrainingActive
      ? (isPlanExpanded && plan ? "training-expanded" : "training")
      : plan
        ? (isPlanExpanded ? "plan-expanded" : "plan")
        : "normal";
  return (
    <PhoneShell bottomPaddingMode={bottomPaddingMode}>
      <PhoneHeader
        title={plan?.title || "训练对话"}
        subtitle={targetDate}
        modelStatus={modelStatus}
        statusText={statusText}
        isBusy={isBusy}
        onNewSession={resetLocalSession}
        onGeneratePlan={initialize}
      />

      <div className="rts-phone-date-tools" aria-label="目标日期">
        <label>
          <span>目标日期</span>
          <input
            type="date"
            value={targetDate}
            onChange={(event) => {
              if (event.target.value) setTargetDate(event.target.value);
            }}
          />
        </label>
        <button type="button" onClick={() => setToolPanelOpen((open) => !open)}>
          摄像头
        </button>
        <button type="button" onClick={toggleMusclePicker}>
          肌群选择
        </button>
      </div>

      {isMusclePickerOpen ? (
        <div className="rts-phone-muscle-panel">
          <MusclePicker
            selectedMuscles={selectedMuscles}
            onToggleMuscle={toggleMuscle}
            onConfirm={confirmMuscles}
          />
        </div>
      ) : null}

      {isToolPanelOpen ? (
        <section className="rts-phone-tool-panel" aria-label="摄像头输入">
          {canUseCamera ? (
            <CameraInputButton disabled={isBusy} onClick={runCamera} />
          ) : (
            <div className="rounded-lg border border-[#ecd9b8] bg-[#fffaf2] px-4 py-3 text-sm text-[#8a5b10]">
              先生成或恢复一个训练计划，再打开摄像头检查具体动作。
            </div>
          )}
        </section>
      ) : null}

      {!isMusclePickerOpen ? (
        <PhoneThread
          messages={messages}
          currentItem={currentItem}
          session={session}
          agentUi={agentUi}
          riskNote={riskNote}
          isBusy={isBusy}
          statusText={statusText}
          onAgentAction={(action) => submit(action, "quick_action")}
        />
      ) : null}

      {!isMusclePickerOpen ? (
        <PhonePlanDock
          plan={plan}
          currentItem={currentItem}
          session={session}
          isExpanded={isPlanExpanded}
          isBusy={isBusy}
          isTrainingActive={isTrainingActive}
          isEnded={isEnded}
          onToggleExpanded={() => setPlanExpanded((expanded) => !expanded)}
          onStartTraining={() => submit("开始训练", "quick_action")}
        />
      ) : null}

      <PhoneComposer
        input={input}
        isBusy={isBusy}
        isTrainingActive={isTrainingActive}
        isQuickMenuOpen={!isMusclePickerOpen && isQuickMenuOpen}
        quickActions={quickActions}
        onInputChange={setInput}
        onSubmit={(text) => submit(text)}
        onToggleQuickMenu={() => {
          if (isMusclePickerOpen) return;
          setQuickMenuOpen((open) => !open);
        }}
        onQuickAction={(action) => submit(action, "quick_action")}
        onFinishTraining={finishTraining}
      />
    </PhoneShell>
  );
}
