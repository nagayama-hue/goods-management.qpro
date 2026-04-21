import Link from "next/link";
import { getAllTargets } from "@/lib/targetStore";
import { getAllCampaigns } from "@/lib/ecCampaignStore";
import EcBudgetTable from "./EcBudgetTable";
import type { MonthlyTarget } from "@/types/target";

const YEAR = 2026;
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const CAMPAIGN_TYPE_TO_FIELD: Record<string, string> = {
  "通常販売":       "ecRegular",
  "季節企画":       "ecSeasonal",
  "受注企画":       "ecPreorder",
  "FC連動限定企画": "ecFc",
  "周年企画":       "ecAnniversary",
};

export default function EcPage() {
  const stored = getAllTargets().filter((t) => t.year === YEAR);

  // 12ヶ月分を必ず揃える（未設定月はゼロ埋め）
  const allTargets: MonthlyTarget[] = MONTHS.map((m) => {
    return (
      stored.find((t) => t.month === m) ?? {
        year:           YEAR,
        month:          m,
        venueHosted:    0,
        venueEvent:     0,
        ecRegular:      0,
        ecSeasonal:     0,
        ecPreorder:     0,
        ecFc:           0,
        ecAnniversary:  0,
      }
    );
  });

  const campaigns = getAllCampaigns().filter(
    (c) => c.targetMonth.startsWith(String(YEAR))
  );

  // 企画管理から月×フィールド別の「目標合計」を集計（予算表の参照表示用）
  const campaignTotals: Record<number, Record<string, number>> = {};
  for (const m of MONTHS) campaignTotals[m] = {};
  for (const c of campaigns) {
    const monthNum = parseInt(c.targetMonth.split("-")[1], 10);
    const field    = CAMPAIGN_TYPE_TO_FIELD[c.type];
    if (!field) continue;
    campaignTotals[monthNum][field] = (campaignTotals[monthNum][field] ?? 0) + c.target;
  }

  // 企画管理から月×フィールド別の「実績合計」を集計（actual 入力済みのみ）
  const campaignActuals: Record<number, Record<string, number>> = {};
  for (const m of MONTHS) campaignActuals[m] = {};
  for (const c of campaigns.filter((c) => c.actual !== undefined)) {
    const monthNum = parseInt(c.targetMonth.split("-")[1], 10);
    const field    = CAMPAIGN_TYPE_TO_FIELD[c.type];
    if (!field) continue;
    campaignActuals[monthNum][field] = (campaignActuals[monthNum][field] ?? 0) + (c.actual ?? 0);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">EC管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            ECの月別予算目標と、企画ごとの目標・実績を管理します。
          </p>
        </div>
        <Link href="/dashboard" className="shrink-0 text-sm text-gray-400 hover:text-gray-700">
          ← ダッシュボード
        </Link>
      </div>

      {/* タブナビ */}
      <div className="flex gap-1 border-b border-gray-200">
        <span className="border-b-2 border-gray-900 px-4 py-2 text-sm font-medium text-gray-900">予算管理表</span>
        <Link href="/ec/campaigns" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800">企画管理</Link>
        <Link href="/ec/results"   className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800">実績管理</Link>
        <Link href="/ec/sales"     className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800">売上明細</Link>
      </div>

      <p className="text-xs text-gray-500">
        {YEAR}年・月別EC目標 — セルを直接編集して「保存する」を押してください。
      </p>

      <EcBudgetTable
        year={YEAR}
        allTargets={allTargets}
        campaignTotals={campaignTotals}
        campaignActuals={campaignActuals}
      />
    </div>
  );
}
