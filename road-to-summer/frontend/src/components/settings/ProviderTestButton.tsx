"use client";

import { useState } from "react";
import { testProvider } from "../../lib/api";
import type { ProviderCategory } from "../../lib/types";

export function ProviderTestButton({ category, id }: { category: ProviderCategory; id?: string }) {
  const [status, setStatus] = useState("");
  const [isBusy, setBusy] = useState(false);

  async function runTest() {
    setBusy(true);
    setStatus("");
    try {
      const result = await testProvider(category, id);
      setStatus(result.ok ? `可用：${result.message}` : `不可用：${result.message}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button className="rounded-md border border-[#d8e1d8] px-3 py-1.5 text-xs font-medium" disabled={isBusy} onClick={runTest} type="button">
        {isBusy ? "测试中" : "测试连接"}
      </button>
      {status && <span className="text-xs text-[#536158]">{status}</span>}
    </div>
  );
}
