"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ITEMS = [
  { href: "/training", label: "训练" },
  { href: "/history", label: "历史" },
  { href: "/memory", label: "Memory" },
  { href: "/settings", label: "设置" }
];

export function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/") return null;

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }

  return (
    <nav className="sticky top-0 z-30 border-b border-[#dfe6dc] bg-[#f7faf5]/95 px-4 py-2 backdrop-blur md:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-[#cbd8cc] bg-white px-3 py-1.5 text-sm font-medium text-[#17201b] hover:bg-[#eef2ec]"
            onClick={goBack}
            type="button"
          >
            ← 返回
          </button>
          <Link className="rounded-md bg-[#195b46] px-3 py-1.5 text-sm font-medium text-white" href="/">
            首页
          </Link>
        </div>
        <div className="flex flex-wrap gap-1">
          {ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                className={active ? "rounded-md bg-[#e3ece2] px-3 py-1.5 text-sm font-medium text-[#195b46]" : "rounded-md px-3 py-1.5 text-sm font-medium text-[#536158] hover:bg-white"}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
