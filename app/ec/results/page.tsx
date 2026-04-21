import Link from "next/link";
import { getAllTargets } from "@/lib/targetStore";
import { getAllCampaigns } from "@/lib/ecCampaignStore";
import { formatCurrency } from "@/lib/format";
import {
  calcPct,
  calcGap,
  achieveBg,
  achieveTextColor,
  achieveBadgeClass,
  progressWidth,
  progressBarColor,
} from "@/lib/ecAnalytics";
import type { EcCampaignType } from "@/types/ecCampaign";

const YEAR   = 2026;
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const MONTH_LABELS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

type EcField = "ecRegular" | "ecSeasonal" | "ecPreorder" | "ecFc" | "ecAnniversary";

const EC_ROWS: { field: EcField; label: string }[] = [
  { field: "ecRegular",     label: "通常販売"       },
  { field: "ecSeasonal",    label: "季節企画"       },
  { field: "ecPreorder",    label: "受注企画"       },
  { field: "ecFc",          label: "FC連動限定企画" },
  { field: "ecAnniversary", label: "周年企画"       },
];

const CAMPAIGN_TYPE_TO_FIELD: Record<EcCampaignType, EcField> = {
  通常販売:       "ecRegular",
  季節企画:       "ecSeasonal",
  受注企画:       "ecPreorder",
  FC連動限定企画: "ecFc",
  周年企画:       "ecAnniversary",
};

export default function EcResultsPage() {
  const stored    = getAllTargets().filter((t) => t.year === YEAR);
  const campaigns = getAllCampaigns().filter(
    (c) => c.targetMonth.startsWith(String(YEAR))
  );

  // 現在月
  const today        = new Date().toISOString().slice(0, 7); // "2026-03"
  const thisMonthNum = parseInt(today.split("-")[1], 10);

  // 月ごとのターゲット（ゼロ埋め）
  const targets: Record<number, Record<EcField, number>> = {};
  for (const m of MONTHS) {
    const t = stored.find((t) => t.month === m);
    targets[m] = {
      ecRegular:     t?.ecRegular     ?? 0,
      ecSeasonal:    t?.ecSeasonal    ?? 0,
      ecPreorder:    t?.ecPreorder    ?? 0,
      ecFc:          t?.ecFc          ?? 0,
      ecAnniversary: t?.ecAnniversary ?? 0,
    };
  }

  // キャンペーン実績を month × field で集計
  const actuals: Record<number, Record<EcField, number>> = {};
  // 企画が存在するか（"未入力" 表示用）
  const hasCampaign: Record<number, Record<EcField, boolean>> = {};
  for (const m of MONTHS) {
    actuals[m]     = { ecRegular: 0, ecSeasonal: 0, ecPreorder: 0, ecFc: 0, ecAnniversary: 0 };
    hasCampaign[m] = { ecRegular: false, ecSeasonal: false, ecPreorder: false, ecFc: false, ecAnniversary: false };
  }
  for (const c of campaigns) {
    const monthNum = parseInt(c.targetMonth.split("-")[1], 10);
    const field    = CAMPAIGN_TYPE_TO_FIELD[c.type];
    hasCampaign[monthNum][field] = true;
    if (c.actual !== undefined) actuals[monthNum][field] += c.actual;
  }

  // 集計関数
  const annualTarget  = (field: EcField) => MONTHS.reduce((s, m) => s + targets[m][field], 0);
  const annualActual  = (field: EcField) => MONTHS.reduce((s, m) => s + actuals[m][field],  0);
  const colTarget     = (m: number) => EC_ROWS.reduce((s, { field }) => s + targets[m][field], 0);
  const colActual     = (m: number) => EC_ROWS.reduce((s, { field }) => s + actuals[m][field],  0);
  const grandTarget   = EC_ROWS.reduce((s, { field }) => s + annualTarget(field), 0);
  const grandActual   = EC_ROWS.reduce((s, { field }) => s + annualActual(field), 0);
  const grandPct      = calcPct(grandActual, grandTarget);
  const grandGap      = grandActual > 0 ? calcGap(grandActual, grandTarget) : null;

  // 今月データ
  const thisTarget = colTarget(thisMonthNum);
  const thisActual = colActual(thisMonthNum);
  const thisPct    = calcPct(thisActual, thisTarget);
  const thisGap    = calcGap(thisActual, thisTarget);
  const thisPendingCount = EC_ROWS.filter(({ field }) =>
    hasCampaign[thisMonthNum][field] && actuals[thisMonthNum][field] === 0
  ).length;

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
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
        <Link href="/ec"           className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800">予算管理表</Link>
        <Link href="/ec/campaigns" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800">企画管理</Link>
        <span className="border-b-2 border-gray-900 px-4 py-2 text-sm font-medium text-gray-900">実績管理</span>
        <Link href="/ec/sales"     className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800">売上明細</Link>
      </div>

      {/* ── Section A: 年間サマリー ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400">年間EC目標</p>
          <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums">{formatCurrency(grandTarget)}</p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400">年間EC実績</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${grandActual > 0 ? achieveTextColor(grandPct) : "text-gray-300"}`}>
            {grandActual > 0 ? formatCurrency(grandActual) : "—"}
          </p>
        </div>
        <div className={`rounded border p-4 ${grandPct !== null ? achieveBg(grandPct) + " border-transparent" : "border-gray-200 bg-white"}`}>
          <p className="text-xs text-gray-400">年間達成率</p>
          {grandPct !== null ? (
            <>
              <p className={`mt-1 text-xl font-bold tabular-nums ${achieveTextColor(grandPct)}`}>{grandPct}%</p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-200">
                <div
                  className={`h-1.5 rounded-full ${progressBarColor(grandPct)}`}
                  style={{ width: `${progressWidth(grandPct)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="mt-1 text-xl font-bold text-gray-300">—</p>
          )}
        </div>
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400">年間不足額</p>
          {grandGap !== null ? (
            <p className={`mt-1 text-xl font-bold tabular-nums ${grandGap > 0 ? "text-red-500" : "text-green-600"}`}>
              {grandGap > 0 ? `▲ ${formatCurrency(grandGap)}` : `超過 ${formatCurrency(-grandGap)}`}
            </p>
          ) : (
            <p className="mt-1 text-xl font-bold text-gray-300">—</p>
          )}
        </div>
      </div>

      {/* ── Section B: 今月の達成状況 ─────────────────────────────── */}
      <div className={`rounded border px-5 py-4 ${thisPct !== null ? achieveBg(thisPct) + " border-transparent" : "border-gray-200 bg-white"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-700">
                今月（{thisMonthNum}月）の達成状況
              </p>
              {thisPct !== null && (
                <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${achieveBadgeClass(thisPct)}`}>
                  {thisPct}%
                </span>
              )}
            </div>
            {/* プログレスバー */}
            <div className="h-2 w-full max-w-md rounded-full bg-gray-200">
              <div
                className={`h-2 rounded-full transition-all ${progressBarColor(thisPct)}`}
                style={{ width: `${progressWidth(thisPct)}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 tabular-nums">
              実績 <span className={`font-bold ${thisPct !== null ? achieveTextColor(thisPct) : "text-gray-400"}`}>
                {thisActual > 0 ? formatCurrency(thisActual) : "—"}
              </span>
              　／　目標 <span className="font-medium text-gray-700">{formatCurrency(thisTarget)}</span>
            </p>
          </div>
          <div className="text-right space-y-1">
            {thisGap > 0 && thisActual > 0 && (
              <p className="text-lg font-bold text-red-500 tabular-nums">
                あと {formatCurrency(thisGap)} 必要
              </p>
            )}
            {thisGap <= 0 && thisActual > 0 && (
              <p className="text-lg font-bold text-green-600 tabular-nums">
                目標達成 ＋{formatCurrency(-thisGap)}
              </p>
            )}
            {thisActual === 0 && (
              <p className="text-sm text-gray-400">実績未入力</p>
            )}
            {thisPendingCount > 0 && (
              <Link
                href="/ec/campaigns"
                className="block text-xs text-orange-600 hover:underline"
              >
                ⚠ 未入力の企画 {thisPendingCount}件 → 入力する
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Section C: 月別実績テーブル ───────────────────────────── */}
      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="sticky left-0 z-10 min-w-[130px] border-r border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500">
                カテゴリ
              </th>
              {MONTHS.map((m, i) => (
                <th
                  key={m}
                  className={`min-w-[80px] px-2 py-3 text-center text-xs font-medium ${
                    m === thisMonthNum
                      ? "bg-blue-50 text-blue-600 font-semibold"
                      : "text-gray-500"
                  }`}
                >
                  {MONTH_LABELS[i]}
                  {m === thisMonthNum && <span className="ml-1 text-xs">▶</span>}
                </th>
              ))}
              <th className="min-w-[100px] border-l border-gray-200 px-4 py-3 text-right text-xs font-semibold text-gray-600">
                年間合計
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {EC_ROWS.map(({ field, label }) => {
              const aTotal = annualActual(field);
              const tTotal = annualTarget(field);
              const aPct   = calcPct(aTotal, tTotal);
              const aGap   = aTotal > 0 ? calcGap(aTotal, tTotal) : null;

              return (
                <tr key={field}>
                  <td className="sticky left-0 z-10 border-r border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 whitespace-nowrap">
                    {label}
                  </td>
                  {MONTHS.map((m) => {
                    const actual    = actuals[m][field];
                    const target    = targets[m][field];
                    const hasData   = hasCampaign[m][field];
                    const pct       = calcPct(actual, target);
                    const gap       = actual > 0 ? calcGap(actual, target) : null;
                    const isThisMonth = m === thisMonthNum;

                    return (
                      <td
                        key={m}
                        className={`px-2 py-2 text-center align-top ${achieveBg(pct)} ${isThisMonth ? "ring-1 ring-inset ring-blue-200" : ""}`}
                      >
                        {/* 実績 */}
                        {actual > 0 ? (
                          <p className={`tabular-nums font-semibold ${achieveTextColor(pct)}`}>
                            {formatCurrency(actual)}
                          </p>
                        ) : hasData ? (
                          <p className="text-orange-500 font-medium">未入力</p>
                        ) : (
                          <p className="text-gray-300">—</p>
                        )}
                        {/* 目標 */}
                        {target > 0 && (
                          <p className="mt-0.5 tabular-nums text-gray-400">
                            目標 {formatCurrency(target)}
                          </p>
                        )}
                        {/* 達成率 */}
                        {pct !== null && (
                          <p className={`mt-0.5 tabular-nums font-semibold ${achieveTextColor(pct)}`}>
                            {pct}%
                          </p>
                        )}
                        {/* 不足額 */}
                        {gap !== null && gap > 0 && (
                          <p className="mt-0.5 tabular-nums text-red-400">
                            残 {formatCurrency(gap)}
                          </p>
                        )}
                      </td>
                    );
                  })}

                  {/* 年間合計列 */}
                  <td className={`border-l border-gray-200 px-4 py-2 text-right align-top ${achieveBg(aPct)}`}>
                    {aTotal > 0 ? (
                      <p className={`tabular-nums font-semibold ${achieveTextColor(aPct)}`}>
                        {formatCurrency(aTotal)}
                      </p>
                    ) : (
                      <p className="text-gray-300">—</p>
                    )}
                    {tTotal > 0 && (
                      <p className="mt-0.5 tabular-nums text-gray-400">目標 {formatCurrency(tTotal)}</p>
                    )}
                    {aPct !== null && (
                      <p className={`mt-0.5 tabular-nums font-semibold ${achieveTextColor(aPct)}`}>{aPct}%</p>
                    )}
                    {aGap !== null && aGap > 0 && (
                      <p className="mt-0.5 tabular-nums text-red-400">残 {formatCurrency(aGap)}</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* 月間合計フッター */}
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-50">
              <td className="sticky left-0 z-10 border-r border-gray-200 bg-gray-50 px-4 py-2.5 font-semibold text-gray-700">
                月間合計
              </td>
              {MONTHS.map((m) => {
                const ca    = colActual(m);
                const ct    = colTarget(m);
                const cpct  = calcPct(ca, ct);
                const cgap  = ca > 0 ? calcGap(ca, ct) : null;
                const isThisMonth = m === thisMonthNum;
                return (
                  <td
                    key={m}
                    className={`px-2 py-2.5 text-center align-top ${achieveBg(cpct)} ${isThisMonth ? "ring-1 ring-inset ring-blue-200" : ""}`}
                  >
                    {ca > 0 ? (
                      <p className={`tabular-nums font-semibold ${achieveTextColor(cpct)}`}>{formatCurrency(ca)}</p>
                    ) : (
                      <p className="text-gray-300">—</p>
                    )}
                    {ct > 0 && (
                      <p className="mt-0.5 tabular-nums text-gray-400">目標 {formatCurrency(ct)}</p>
                    )}
                    {cpct !== null && (
                      <p className={`mt-0.5 tabular-nums font-semibold ${achieveTextColor(cpct)}`}>{cpct}%</p>
                    )}
                    {cgap !== null && cgap > 0 && (
                      <p className="mt-0.5 tabular-nums text-red-400">残 {formatCurrency(cgap)}</p>
                    )}
                  </td>
                );
              })}
              <td className={`border-l border-gray-200 px-4 py-2.5 text-right align-top ${achieveBg(grandPct)}`}>
                {grandActual > 0 ? (
                  <p className={`tabular-nums font-bold ${achieveTextColor(grandPct)}`}>{formatCurrency(grandActual)}</p>
                ) : (
                  <p className="text-gray-300">—</p>
                )}
                {grandTarget > 0 && (
                  <p className="mt-0.5 tabular-nums text-gray-400">目標 {formatCurrency(grandTarget)}</p>
                )}
                {grandPct !== null && (
                  <p className={`mt-0.5 tabular-nums font-bold ${achieveTextColor(grandPct)}`}>{grandPct}%</p>
                )}
                {grandGap !== null && grandGap > 0 && (
                  <p className="mt-0.5 tabular-nums text-red-400">残 {formatCurrency(grandGap)}</p>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        ※ 実績は「企画管理」に登録された企画の実績入力値を月×カテゴリで集計しています。
        実績の入力は
        <Link href="/ec/campaigns" className="ml-1 text-blue-500 hover:underline">企画管理</Link>
        から行ってください。
        色分け：
        <span className="ml-1 text-green-600">緑 ≥ 80%</span>・
        <span className="ml-1 text-yellow-600">黄 50〜79%</span>・
        <span className="ml-1 text-red-500">赤 ≤ 49%</span>
      </p>
    </div>
  );
}
