"use client";

import Link from "next/link";

type PhoneHeaderProps = {
  title: string;
  subtitle: string;
  modelStatus: string;
  statusText: string;
  isBusy: boolean;
  onNewSession: () => void;
  onGeneratePlan: () => void;
};

export function PhoneHeader({
  title,
  subtitle,
  modelStatus,
  statusText,
  isBusy,
  onNewSession,
  onGeneratePlan
}: PhoneHeaderProps) {
  return (
    <header className="rts-phone-header">
      <div className="rts-phone-brand" aria-hidden="true" />
      <div className="rts-phone-header-copy">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <span>{modelStatus}</span>
      </div>
      <div className="rts-phone-header-actions">
        <button type="button" disabled={isBusy} onClick={onNewSession}>
          新对话
        </button>
        <button type="button" disabled={isBusy} onClick={onGeneratePlan}>
          生成计划
        </button>
      </div>
      <div className="rts-phone-status-row">
        <Link href="/">首页</Link>
        <span>{statusText}</span>
      </div>
    </header>
  );
}
