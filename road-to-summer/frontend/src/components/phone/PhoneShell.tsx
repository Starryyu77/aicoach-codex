"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type PhoneShellProps = {
  children: ReactNode;
  bottomPaddingMode?: "normal" | "plan" | "plan-expanded" | "training" | "training-expanded";
};

export function PhoneShell({ children, bottomPaddingMode = "normal" }: PhoneShellProps) {
  return (
    <main className="rts-phone-page">
      <section className={`rts-phone-frame rts-phone-frame--${bottomPaddingMode}`} aria-label="Road to Summer 手机训练界面">
        {children}
        <nav className="rts-phone-bottom-nav" aria-label="手机底部导航">
          <Link className="rts-phone-bottom-nav-active" href="/phone">
            手机
          </Link>
          <Link href="/training">驾驶舱</Link>
          <Link href="/history">历史</Link>
          <Link href="/settings">设置</Link>
        </nav>
      </section>
    </main>
  );
}
