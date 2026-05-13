import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f4f7f2] px-6 py-8 text-[#17201b]">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold">Road to Summer</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#536158]">
            Hermes 底座上的运动健身 Agent 扩展。第一版聚焦训练驾驶舱、语音输入、视频动作反馈 mock、结构化计划和训练卡片。
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link className="rounded-lg bg-white p-5 shadow-sm" href="/training">
            <span className="text-sm text-[#536158]">开始</span>
            <div className="mt-2 text-xl font-semibold">Training Cockpit</div>
          </Link>
          <Link className="rounded-lg bg-white p-5 shadow-sm" href="/history">
            <span className="text-sm text-[#536158]">查看</span>
            <div className="mt-2 text-xl font-semibold">历史训练卡片</div>
          </Link>
          <Link className="rounded-lg bg-white p-5 shadow-sm" href="/memory">
            <span className="text-sm text-[#536158]">查看</span>
            <div className="mt-2 text-xl font-semibold">Hermes Memory</div>
          </Link>
        </div>
      </section>
    </main>
  );
}

