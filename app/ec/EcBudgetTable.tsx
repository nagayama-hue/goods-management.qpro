"use client";

import { useState, useTransition } from "react";
import { saveEcTargetsAction } from "./actions";
import { formatCurrency } from "@/lib/format";
import {
  calcPct,
  calcGap,
  achieveBg,
  achieveTextColor,
  achieveBadgeClass,
} from "@/lib/ecAnalytics";
import type { MonthlyTarget } from "@/types/target";

type EcField = "ecRegular" | "ecSeasonal" | "ecPreorder" | "ecFc" | "ecAnniversary";

const EC_ROWS: { field: EcField; label: string }[] = [
  { field: "ecRegular",     label: "通常販売"       },
  { field: "ecSeasonal",    label: "季節企画"       },
  { field: "ecPreorder",    label: "受注企画"       },
  { field: "ecFc",          label: "FC連動限定企画" },
  { field: "ecAnniversary", label: "周年企画"       },
];

/** 企画目標の参照表示対象（通常販売以外）*/
const CAMPAIGN_FIELDS = new Set<EcField>([
  "ecSeasonal", "ecPreorder", "ecFc", "ecAnniversary",
]);

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const MONTH_LABELS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

interface Props {
  year:            number;
  allTargets:      MonthlyTarget[];
  /** 企画管理の目標合計（参照表示用） */
  campaignTotals:  Record<number, Record<string, number>>;
  /** 企画管理の実績合計（達成率表示用） */
  campaignActuals: Record<number, Record<string, number>>;
}

type Values = Record<number, Record<EcField, number>>;

function initValues(allTargets: MonthlyTarget[]): Values {
  const init: Values = {};
  for (const m of MONTHS) {
    const t = allTargets.find((t) => t.month === m);
    init[m] = {
      ecRegular:     t?.ecRegular     ?? 0,
      ecSeasonal:    t?.ecSeasonal    ?? 0,
      ecPreorder:    t?.ecPreorder    ?? 0,
      ecFc:          t?.ecFc          ?? 0,
      ecAnniversary: t?.ecAnniversary ?? 0,
    };
  }
  return init;
}

export default function EcBudgetTable({ year, allTargets, campaignTotals, campaignActuals }: Props) {
  const [values,  setValues]  = useState<Values>(() => initValues(allTargets));
  const [pending, startTransition] = useTransition();
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  const setVal = (month: number, field: EcField, raw: string) => {
    const n = parseInt(raw, 10);
    setValues((v) => ({
      ...v,
      [month]: { ...v[month], [field]: isNaN(n) || n < 0 ? 0 : n },
    }));
    setSaved(false);
    setError("");
  };

  const rowTotal   = (field: EcField) => MONTHS.reduce((s, m) => s + values[m][field], 0);
  const colTotal   = (month: number) => EC_ROWS.reduce((s, { field }) => s + values[month][field], 0);
  const grandTotal = EC_ROWS.reduce((s, { field }) => s + rowTotal(field), 0);

  // 企画実績集計
  const monthActual  = (m: number) => EC_ROWS.reduce((s, { field }) => s + (campaignActuals[m]?.[field] ?? 0), 0);
  const annualActual = MONTHS.reduce((s, m) => s + monthActual(m), 0);
  const annualPct    = calcPct(annualActual, grandTotal);
  const annualGap    = calcGap(annualActual, grandTotal);

  const handleSave = () => {
    setSaved(false);
    setError("");
    startTransition(async () => {
      const targets: MonthlyTarget[] = MONTHS.map((m) => {
        const existing = allTargets.find((t) => t.month === m);
        return {
          year,
          month:          m,
          venueHosted:    existing?.venueHosted    ?? 0,
          venueEvent:     existing?.venueEvent     ?? 0,
          ...values[m],
        };
      });
      const result = await saveEcTargetsAction(targets);
      if (result.ok) setSaved(true);
      else setError(result.error ?? "保存に失敗しました");
    });
  };

  const inputClass =
    "w-full rounded border border-gray-200 px-1.5 py-1 text-right tabular-nums text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400";

  return (
    <div className="space-y-4">
      {/* 操作バー */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* 年間KPI */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-gray-500">
            年間EC合計目標
            <span className="ml-1.5 font-bold text-gray-900 tabular-nums">{formatCurrency(grandTotal)}</span>
          </span>
          {annualActual > 0 && (
            <>
              <span className="text-gray-500">
                実績
                <span className={`ml-1.5 font-bold tabular-nums ${achieveTextColor(annualPct)}`}>
                  {formatCurrency(annualActual)}
                </span>
              </span>
              <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${achieveBadgeClass(annualPct)}`}>
                {annualPct}%
              </span>
              {annualGap > 0 && (
                <span className="text-sm text-red-500 tabular-nums">
                  不足 {formatCurrency(annualGap)}
                </span>
              )}
            </>
          )}
        </div>
        {/* 保存 */}
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600">✓ 保存しました</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
          <button
            onClick={handleSave}
            disabled={pending}
            className="rounded bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {pending ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>

      {/* 予算テーブル */}
      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="sticky left-0 z-10 min-w-[130px] border-r border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500">
                カテゴリ
              </th>
              {MONTH_LABELS.map((label, i) => (
                <th key={i} className="min-w-[88px] px-2 py-3 text-center text-xs font-medium text-gray-500">
                  {label}
                </th>
              ))}
              <th className="min-w-[96px] border-l border-gray-200 px-4 py-3 text-right text-xs font-semibold text-gray-600">
                年間合計
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {EC_ROWS.map(({ field, label }) => (
              <tr key={field} className="hover:bg-blue-50/30">
                <td className="sticky left-0 z-10 border-r border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 whitespace-nowrap hover:bg-blue-50/30">
                  {label}
                </td>
                {MONTHS.map((m) => {
                  const campaignTotal = campaignTotals[m]?.[field] ?? 0;
                  const showRef = CAMPAIGN_FIELDS.has(field) && campaignTotal > 0;
                  return (
                    <td key={m} className="px-1.5 py-1.5">
                      <input
                        type="number"
                        value={values[m][field] || ""}
                        onChange={(e) => setVal(m, field, e.target.value)}
                        min={0}
                        step={1000}
                        placeholder="0"
                        className={inputClass}
                      />
                      {showRef && (
                        <p className="mt-0.5 text-right text-xs text-blue-500 tabular-nums">
                          企画: {formatCurrency(campaignTotal)}
                        </p>
                      )}
                    </td>
                  );
                })}
                <td className="border-l border-gray-200 px-4 py-2 text-right tabular-nums font-semibold text-gray-800">
                  {formatCurrency(rowTotal(field))}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            {/* 月間合計 */}
            <tr className="border-t-2 border-gray-300 bg-gray-50">
              <td className="sticky left-0 z-10 border-r border-gray-200 bg-gray-50 px-4 py-2.5 font-semibold text-gray-700">
                月間合計
              </td>
              {MONTHS.map((m) => (
                <td key={m} className="px-2 py-2.5 text-right tabular-nums font-medium text-gray-700">
                  {formatCurrency(colTotal(m))}
                </td>
              ))}
              <td className="border-l border-gray-200 px-4 py-2.5 text-right tabular-nums font-bold text-gray-900">
                {formatCurrency(grandTotal)}
              </td>
            </tr>
            {/* 月別達成率 */}
            <tr className="border-t border-gray-200 bg-gray-50/60">
              <td className="sticky left-0 z-10 border-r border-gray-200 bg-gray-50/60 px-4 py-1.5 text-xs font-medium text-gray-500">
                達成率
              </td>
              {MONTHS.map((m) => {
                const ma  = monthActual(m);
                const mt  = colTotal(m);
                const pct = ma > 0 ? calcPct(ma, mt) : null;
                return (
                  <td key={m} className={`px-2 py-1.5 text-center text-xs ${achieveBg(pct)}`}>
                    {pct !== null ? (
                      <span className={`font-semibold tabular-nums ${achieveTextColor(pct)}`}>
                        {pct}%
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                );
              })}
              <td className={`border-l border-gray-200 px-4 py-1.5 text-right text-xs ${achieveBg(annualPct)}`}>
                {annualPct !== null ? (
                  <span className={`font-semibold tabular-nums ${achieveTextColor(annualPct)}`}>
                    {annualPct}%
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        ※ セル下の青い数字は企画管理に登録された企画目標の合計です。
        達成率は企画管理の実績入力値をもとに算出しています。
        現場の目標は
        <a href="/dashboard/targets" className="ml-1 text-blue-500 hover:underline">売上目標設定</a>
        から変更できます。
      </p>
    </div>
  );
}
