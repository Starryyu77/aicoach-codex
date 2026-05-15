"use client";

import { FormEvent, KeyboardEvent } from "react";
import { PhoneQuickMenu } from "./PhoneQuickMenu";
import { PhoneVoiceButton } from "./PhoneVoiceButton";

type PhoneComposerProps = {
  input: string;
  isBusy: boolean;
  isTrainingActive: boolean;
  isQuickMenuOpen: boolean;
  quickActions: string[];
  onInputChange: (value: string) => void;
  onSubmit: (text: string) => void;
  onToggleQuickMenu: () => void;
  onQuickAction: (action: string) => void;
  onFinishTraining: () => void;
};

export function PhoneComposer({
  input,
  isBusy,
  isTrainingActive,
  isQuickMenuOpen,
  quickActions,
  onInputChange,
  onSubmit,
  onToggleQuickMenu,
  onQuickAction,
  onFinishTraining
}: PhoneComposerProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    onSubmit(text);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  function handleVoiceTranscript(text: string) {
    const transcript = text.trim();
    if (!transcript) return;
    onInputChange(input.trim() ? `${input.trim()} ${transcript}` : transcript);
  }

  return (
    <form className={isTrainingActive ? "rts-phone-composer rts-phone-composer--training" : "rts-phone-composer"} onSubmit={handleSubmit}>
      {isTrainingActive ? (
        <button className="rts-phone-finish" type="button" disabled={isBusy} onClick={onFinishTraining}>
          结束并保存
        </button>
      ) : null}
      {isQuickMenuOpen ? <PhoneQuickMenu actions={quickActions} onAction={onQuickAction} /> : null}
      <div className="rts-phone-composer-row">
        <button
          className="rts-phone-menu-button"
          type="button"
          aria-label="打开快捷操作"
          aria-expanded={isQuickMenuOpen}
          onClick={onToggleQuickMenu}
        >
          +
        </button>
        <label htmlFor="rts-phone-input">输入</label>
        <textarea
          id="rts-phone-input"
          rows={1}
          value={input}
          placeholder="做完一组、器械占用、身体反馈..."
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <PhoneVoiceButton disabled={isBusy} onTranscript={handleVoiceTranscript} />
        <button className="rts-phone-send" type="submit" disabled={isBusy} aria-label={isBusy ? "处理中" : "发送"}>
          {isBusy ? "..." : "↑"}
        </button>
      </div>
    </form>
  );
}
