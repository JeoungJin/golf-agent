"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { label: "공지사항", href: "/notices", match: (p: string) => p.startsWith("/notices") },
  {
    label: "스크린",
    href: "/rounds?kind=screen",
    match: (p: string, kind: string | null) => p === "/rounds" && kind === "screen",
  },
  {
    label: "필드",
    href: "/rounds?kind=field",
    match: (p: string, kind: string | null) => p === "/rounds" && kind === "field",
  },
];

export function MainTabs() {
  const pathname = usePathname();
  const kind = useSearchParams().get("kind");

  return (
    <nav aria-label="메인 메뉴" className="grid grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
      {TABS.map((tab) => {
        const active = tab.match(pathname, kind);
        return (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg py-2 text-center text-sm font-semibold ${
              active
                ? "bg-green-700 text-white shadow-sm"
                : "text-neutral-600 dark:text-neutral-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
