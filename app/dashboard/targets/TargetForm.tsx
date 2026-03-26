"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveTargetAction } from "./actions";
import { formatCurrency } from "@/lib/format";
import type { MonthlyTarget } from "@/types/target";

const MONTH_NAMES = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

const YEARS = [2025, 2026, 2027];

interface Props {
  year:    number;
  month:   number;
  initial: MonthlyTarget | null;
}

type FieldKey = keyof Omit<MonthlyTarget, "year" | "month">;

const EC_FIELDS: { key: FieldKey; label: string }[] = [
  { key: "ecRegular",     label: "通常販売" },
  { key: "ecSeasonal",    label: "季節企画" },
  { key: "ecPreorder",    label: "受注企画" },
  { key: "ecFc",          label: "FC連動"   },
  { key: "ecAnniversary", label: "周年企画" },
];

export default function TargetForm({ year, month, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");

  const [values, setValues] = useState<Omit<MonthlyTarget, "year" | "month">>({
    venueHosted:    initial?.venueHosted    ?? 0,
    venueEvent:     initial?.venueEvent     ?? 0,
    ecRegular:      initial?.ecRegular      ?? 0,
    ecSeasonal:     initial?.ecSeasonal     ?? 0,
    ecPreorder:     initial?.ecPreorder     ?? 0,
    ecFc:           initial?.ecFc           ?? 0,
    ecAnniversary:  initial?.ecAnniversary  ?? 0,
  });

  const venueTotal = values.venueHosted + values.venueEvent;
  const ecTotal    = values.ecRegular + values.ecSeasonal + values.ecPreorder + values.ecFc + values.ecAnniversary;
  const grandTotal = venueTotal + ecTotal;

  const setVal = (key: FieldKey, raw: string) => {
    const n = parseInt(raw, 10);
    setValues((v) => ({ ...v, [key]: isNaN(n) || n < 0 ? 0 : n }));
    setSaved(false);
  };

  const handlePeriodChange = (newYear: number, newMonth: number) => {
    router.push(`/dashboard/targets?year=${newYear}&month=${newMonth}`);
  };

  const handleSave = () => {
    setError("");
    setSaved(false);
    startTransition(async () => {
      const result = await saveTargetAction({ year, month, ...values });
      if (result.ok) setSaved(true);
      else setError(result.error ?? "保存に失敗しました");
    });
  };

  const inputClass =
    "w-full rounded border border-gray-300 px-3 py-2 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-5">
      {/* 年月セレクタ */}
      <div className="flex flex-wrap items-center gap-3 rounded border border-gray-200 bg-white px-4 py-3">
        <span className="text-sm font-medium text-gray-700">設定する期間</span>
        <select
          value={year}
          onChange={(e) => handlePeriodChange(parseInt(e.target.value), month)}
          className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}年</option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => handlePeriodChange(year, parseInt(e.target.value))}
          className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none"
        >
          {MONTH_NAMES.map((label, i) => (
            <option key={i + 1} value={i + 1}>{label}</option>
          ))}
        </select>
        {initial ? (
          <span className="text-xs text-green-600">✓ 目標設定済み</span>
        ) : (
          <span className="text-xs text-gray-400">未設定</span>
        )}
      </div>

      {/* 入力エリア */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 現場 */}
        <div className="rounded border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-baseline justify-between border-b border-gray-100 pb-2">
            <h2 className="text-sm font-semibold text-gray-700">現場</h2>
            <span className="text-base font-semibold text-gray-900 tabular-nums">
              {formatCurrency(venueTotal)}
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">主催大会</label>
              <input
                type="number"
                value={values.venueHosted || ""}
                onChange={(e) => setVal("venueHosted", e.target.value)}
                min={0}
                step={10000}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">イベント</label>
              <input
                type="number"
                value={values.venueEvent || ""}
                onChange={(e) => setVal("venueEvent", e.target.value)}
                min={0}
                step={10000}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* EC */}
        <div className="rounded border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-baseline justify-between border-b border-gray-100 pb-2">
            <h2 className="text-sm font-semibold text-gray-700">EC</h2>
            <span className="text-base font-semibold text-gray-900 tabular-nums">
              {formatCurrency(ecTotal)}
            </span>
          </div>
          <div className="space-y-3">
            {EC_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input
                  type="number"
                  value={values[key] || ""}
                  onChange={(e) => setVal(key, e.target.value)}
                  min={0}
                  step={10000}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 月間合計 */}
      <div className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-4 py-3">
        <span className="text-sm text-gray-500">月間合計目標</span>
        <span className="text-xl font-bold text-gray-900 tabular-nums">
          {formatCurrency(grandTotal)}
        </span>
      </div>

      {/* 保存ボタン */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="rounded bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          {pending ? "保存中..." : "保存する"}
        </button>
        {saved && <span className="text-sm text-green-600">✓ 保存しました</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
