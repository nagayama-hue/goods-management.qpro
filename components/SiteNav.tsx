"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  /** この接頭辞で始まるパスを現在地とみなす */
  match?: string;
  muted?: boolean;
  title?: string;
  suffix?: string;
}

/** 日常的に使う業務メニュー */
const PRIMARY: NavItem[] = [
  { href: "/", label: "商品一覧", match: "exact" },
  { href: "/sales", label: "売上実績" },
  { href: "/events", label: "大会管理" },
  { href: "/ec", label: "EC管理" },
  { href: "/stocktake", label: "棚卸し" },
  { href: "/incentive", label: "インセンティブ" },
];

/** 参照・設定系 */
const SECONDARY: NavItem[] = [
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/meeting", label: "会議ビュー" },
  { href: "/meeting/history", label: "会議履歴" },
  { href: "/goods/suggest", label: "AI案出し" },
  { href: "/goods/suggest/history", label: "提案履歴" },
  { href: "/suppliers", label: "取引先" },
  { href: "/ops", label: "運用チェック" },
  { href: "/airregi", label: "Airレジ", muted: true, title: "保留中（API仕様確認待ち）", suffix: "⏸" },
];

function matches(pathname: string, item: NavItem): boolean {
  if (item.match === "exact") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** 該当する項目のうち最も具体的（href が長い）ものだけを現在地とする */
function activeHref(pathname: string): string | undefined {
  return [...PRIMARY, ...SECONDARY]
    .filter((item) => matches(pathname, item))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export default function SiteNav() {
  const pathname = usePathname() ?? "/";
  const current = activeHref(pathname);

  return (
    <nav className="min-w-0 flex-1 space-y-1">
      {/* 主要メニュー */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {PRIMARY.map((item) => {
          const active = item.href === current;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded px-2.5 py-1 text-sm font-medium transition-colors ${
                active
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* 参照・設定 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {SECONDARY.map((item) => {
          const active = item.href === current;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.title}
              aria-current={active ? "page" : undefined}
              className={`text-xs transition-colors ${
                active
                  ? "font-semibold text-gray-900 underline underline-offset-4"
                  : item.muted
                    ? "text-gray-400 hover:text-gray-600"
                    : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {item.label}
              {item.suffix && <span className="ml-0.5">{item.suffix}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
