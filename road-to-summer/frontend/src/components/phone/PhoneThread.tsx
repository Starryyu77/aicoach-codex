"use client";

import type { AgentUiDocument, PlanItem, SessionSnapshot } from "../../lib/types";
import { MarkdownBlock } from "../MarkdownBlock";
import { PhoneAgentSurface } from "./PhoneAgentSurface";

type PhoneThreadProps = {
  messages: Array<{ role: "user" | "agent"; text: string }>;
  currentItem?: PlanItem;
  session?: SessionSnapshot;
  agentUi?: AgentUiDocument;
  riskNote: string;
  isBusy: boolean;
  statusText: string;
  onAgentAction: (action: string) => void;
};

export function PhoneThread({
  messages,
  currentItem,
  session,
  agentUi,
  riskNote,
  isBusy,
  statusText,
  onAgentAction
}: PhoneThreadProps) {
  return (
    <section className="rts-phone-thread" aria-live="polite">
      <article className="rts-phone-bubble rts-phone-bubble--assistant">
        <span aria-hidden="true">✦</span>
        先选择具体日期，再说目标、身体状态、器械情况，Hermes 会按绝对日期生成结构化训练卡。
      </article>

      {!currentItem && !session?.current_exercise ? (
        <section className="rts-phone-action-card" aria-label="当前训练状态">
          <p>当前动作</p>
          <h2>等待计划</h2>
          <div className="rts-phone-action-grid">
            <span>- 组</span>
            <span>- 次</span>
            <span>RPE -</span>
          </div>
          <small>{statusText}</small>
        </section>
      ) : null}

      {riskNote ? <div className="rts-phone-risk-note">{riskNote}</div> : null}

      {messages.map((message, index) => (
        <article
          className={message.role === "user" ? "rts-phone-bubble rts-phone-bubble--user" : "rts-phone-bubble rts-phone-bubble--assistant"}
          key={`${message.role}-${index}-${message.text.slice(0, 16)}`}
        >
          {message.role === "agent" ? <MarkdownBlock compact content={message.text} /> : message.text}
        </article>
      ))}

      {isBusy ? <article className="rts-phone-bubble rts-phone-bubble--assistant">Hermes 处理中...</article> : null}

      {agentUi ? (
        <div className="rts-phone-agent-surface">
          <PhoneAgentSurface document={agentUi} onAction={onAgentAction} />
        </div>
      ) : null}
    </section>
  );
}
