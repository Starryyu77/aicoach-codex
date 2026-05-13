"use client";

import { FormEvent, useState } from "react";

export function ChatPanel({
  messages,
  onSubmit,
  isBusy
}: {
  messages: Array<{ role: "user" | "agent"; text: string }>;
  onSubmit: (text: string) => void;
  isBusy: boolean;
}) {
  const [text, setText] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
  }

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">训练对话与调整记录</h2>
      <div className="mt-4 flex h-80 flex-col gap-3 overflow-auto rounded-md bg-[#f4f7f2] p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-[#536158]">这里显示 Hermes 回复、计划调整和训练中记录。</p>
        ) : messages.map((message, index) => (
          <div
            className={message.role === "user" ? "self-end rounded-md bg-[#1f7a5a] px-3 py-2 text-sm text-white" : "self-start rounded-md bg-white px-3 py-2 text-sm shadow-sm"}
            key={`${message.role}-${index}`}
          >
            {message.text}
          </div>
        ))}
        {isBusy && <div className="self-start rounded-md bg-white px-3 py-2 text-sm shadow-sm">Hermes 处理中...</div>}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={submit}>
        <input
          className="min-w-0 flex-1 rounded-md border border-[#d8e1d8] px-3 py-2 text-sm outline-none focus:border-[#1f7a5a]"
          placeholder="输入训练反馈，例如：高位下拉有人了"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button className="rounded-md bg-[#17201b] px-4 py-2 text-sm font-medium text-white" type="submit">
          发送
        </button>
      </form>
    </section>
  );
}

