import Link from "next/link";
import { getTarget } from "@/lib/targetStore";
import TargetForm from "./TargetForm";

interface Props {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function TargetsPage({ searchParams }: Props) {
  const params = await searchParams;
  const year   = parseInt(params.year  ?? "2026", 10);
  const month  = parseInt(params.month ?? "3",    10);

  const existing = getTarget(year, month) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">売上目標設定</h1>
          <p className="mt-1 text-sm text-gray-500">
            月ごとのチャネル別売上目標を設定します。
            動員数に合わせて月ごとに調整してください。
          </p>
        </div>
        <Link href="/dashboard" className="shrink-0 text-sm text-gray-400 hover:text-gray-700">
          ← ダッシュボード
        </Link>
      </div>

      <TargetForm year={year} month={month} initial={existing} />
    </div>
  );
}
