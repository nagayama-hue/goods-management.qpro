import Link from "next/link";
import type { RankingItem } from "@/lib/aggregations";

type RankTab = "revenue" | "grossProfit" | "stock";

const TABS: { key: RankTab; label: string }[] = [
  { key: "revenue",     label: "売上"   },
  { key: "grossProfit", label: "粗利"   },
  { key: "stock",       label: "在庫数" },
];

interface Props {
  items: RankingItem[];
  activeTab: RankTab;
  formatPrimary: (v: number) => string;
  formatSecondary: (v: number) => string;
  secondaryLabel: string;
}

export default function RankingList({
  items,
  activeTab,
  formatPrimary,
  formatSecondary,
  secondaryLabel,
}: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* タブ */}
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/dashboard?rank=${tab.key}`}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* ランキング */}
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">データがありません。</p>
      ) : (
        <ol className="divide-y divide-gray-100">
          {items.map((item, i) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-5 text-center text-sm font-semibold text-gray-400">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/goods/${item.id}`}
                  className="block truncate text-sm font-medium text-blue-600 hover:underline"
                >
                  {item.name}
                </Link>
                <p className="text-xs text-gray-400">
                  {secondaryLabel}: {formatSecondary(item.secondary)}
                </p>
              </div>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  item.primary < 0 ? "text-red-600" : "text-gray-900"
                }`}
              >
                {formatPrimary(item.primary)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
