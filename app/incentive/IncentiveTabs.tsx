import Link from "next/link";

const TABS = [
  { href: "/incentive", label: "月次集計" },
  { href: "/incentive/rules", label: "ルール" },
  { href: "/incentive/links", label: "商品×選手 紐付け" },
  { href: "/incentive/wrestlers", label: "選手マスタ" },
] as const;

export default function IncentiveTabs({ active }: { active: string }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
      {TABS.map((t) =>
        t.href === active ? (
          <span key={t.href} className="whitespace-nowrap border-b-2 border-gray-900 px-4 py-2 text-sm font-medium text-gray-900">
            {t.label}
          </span>
        ) : (
          <Link key={t.href} href={t.href} className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800">
            {t.label}
          </Link>
        )
      )}
    </div>
  );
}
