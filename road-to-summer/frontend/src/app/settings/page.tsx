import { ProviderSettingsPanel } from "../../components/settings/ProviderSettingsPanel";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-[#f4f7f2] px-6 py-8 text-[#17201b]">
      <section className="mx-auto grid max-w-6xl gap-5">
        <div>
          <div>
            <h1 className="text-3xl font-semibold">Provider Settings</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#536158]">
              配置 Hermes、ASR 和 Vision Provider。API Key 只写入 Gateway 的 runtime secrets，前端只显示 hasApiKey。
            </p>
          </div>
        </div>
        <ProviderSettingsPanel />
      </section>
    </main>
  );
}
