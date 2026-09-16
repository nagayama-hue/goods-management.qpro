"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { DIFF_REASONS } from "@/types/stocktake";
import type { StocktakeLine } from "@/types/stocktake";
import type { StocktakeInput } from "./actions";

interface Props {
  stocktakeId: string;
  date: string;
  staff: string;
  lines: StocktakeLine[];
  updatedAt: string;
  saveAction: (
    stocktakeId: string,
    inputs: StocktakeInput[]
  ) => Promise<{ ok: boolean; error?: string; savedAt?: string }>;
  confirmAction: (
    stocktakeId: string,
    inputs: StocktakeInput[]
  ) => Promise<{ ok: boolean; error?: string }>;
}

interface RowValue {
  actual: string;   // 空文字 = 未入力（0 と区別する）
  reason: string;
  memo: string;
}

const keyOf = (l: { goodsId: string; variantId: string }) => `${l.goodsId}|${l.variantId}`;

function variantLabel(l: StocktakeLine): string {
  const label = [l.color, l.size].filter(Boolean).join(" / ");
  return label || "—";
}

export default function StocktakeForm({
  stocktakeId, date, staff, lines, updatedAt, saveAction, confirmAction,
}: Props) {
  const [values, setValues] = useState<Record<string, RowValue>>(() =>
    Object.fromEntries(
      lines.map((l) => [
        keyOf(l),
        { actual: l.actual === undefined ? "" : String(l.actual), reason: l.reason ?? "", memo: l.memo ?? "" },
      ])
    )
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unentered" | "diff">("all");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [lastSaved, setLastSaved] = useState<string>(updatedAt);
  const dirtyRef = useRef(false);

  function buildInputs(): StocktakeInput[] {
    return lines.map((l) => {
      const v = values[keyOf(l)];
      const trimmed = v?.actual?.trim() ?? "";
      return {
        goodsId: l.goodsId,
        variantId: l.variantId,
        actual: trimmed === "" ? undefined : Math.max(0, Number(trimmed)),
        reason: v?.reason || undefined,
        memo: v?.memo || undefined,
      };
    });
  }

  function setRow(key: string, patch: Partial<RowValue>) {
    dirtyRef.current = true;
    setValues((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function save(silent = false) {
    startTransition(async () => {
      const result = await saveAction(stocktakeId, buildInputs());
      if (result.ok) {
        dirtyRef.current = false;
        setLastSaved(result.savedAt ?? new Date().toISOString());
        if (!silent) setMessage({ ok: true, text: "保存しました" });
      } else {
        setMessage({ ok: false, text: result.error ?? "保存に失敗しました" });
      }
    });
  }

  // 30秒ごとの自動保存（変更があるときだけ）。現場での取りこぼしを防ぐ
  useEffect(() => {
    const timer = setInterval(() => {
      if (dirtyRef.current && !isPending) save(true);
    }, 30000);
    return () => clearInterval(timer);
  });

  // 未保存のまま離脱しようとしたら警告
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lines.filter((l) => {
      const v = values[keyOf(l)];
      const entered = (v?.actual ?? "").trim() !== "";
      const diff = entered ? Number(v.actual) - l.theoretical : 0;
      if (filter === "unentered" && entered) return false;
      if (filter === "diff" && (!entered || diff === 0)) return false;
      if (!q) return true;
      return (
        l.goodsName.toLowerCase().includes(q) ||
        l.color.toLowerCase().includes(q) ||
        l.size.toLowerCase().includes(q)
      );
    });
  }, [lines, values, query, filter]);

  const stats = useMemo(() => {
    let entered = 0, diffCount = 0, diffTotal = 0;
    for (const l of lines) {
      const v = values[keyOf(l)];
      const raw = (v?.actual ?? "").trim();
      if (raw === "") continue;
      entered++;
      const d = Number(raw) - l.theoretical;
      if (d !== 0) { diffCount++; diffTotal += d; }
    }
    return { entered, total: lines.length, diffCount, diffTotal };
  }, [lines, values]);

  function confirm() {
    const remaining = stats.total - stats.entered;
    const warn = remaining > 0
      ? `未入力が ${remaining} 件あります。未入力の商品は在庫を変更しません。\n`
      : "";
    const ok = window.confirm(
      `${warn}差異のある商品: ${stats.diffCount}件\n\n確定すると、入力した実数がそのまま在庫に反映されます。よろしいですか？`
    );
    if (!ok) return;
    startTransition(async () => {
      const result = await confirmAction(stocktakeId, buildInputs());
      if (!result.ok) setMessage({ ok: false, text: result.error ?? "確定に失敗しました" });
    });
  }

  const progressPct = stats.total > 0 ? Math.round((stats.entered / stats.total) * 100) : 0;

  return (
    <div className="space-y-4 pb-28">
      {message && (
        <div className={`rounded border px-4 py-2 text-sm ${
          message.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-600"
        }`}>
          {message.text}
        </div>
      )}

      {/* 進捗サマリー */}
      <div className="rounded border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500">{date}　担当: {staff}</p>
            <p className="mt-0.5 text-lg font-bold text-gray-900 tabular-nums">
              {stats.entered} / {stats.total} 件 入力済み
              <span className="ml-2 text-sm font-normal text-gray-400">{progressPct}%</span>
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="text-xs text-gray-500">差異あり</p>
            <p className={`font-bold tabular-nums ${stats.diffCount > 0 ? "text-orange-600" : "text-gray-400"}`}>
              {stats.diffCount}件
              {stats.diffCount > 0 && (
                <span className="ml-1 text-xs">（合計 {stats.diffTotal > 0 ? "+" : ""}{stats.diffTotal}個）</span>
              )}
            </p>
          </div>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="mt-2 text-xs text-gray-400">
          最終保存: {new Date(lastSaved).toLocaleString("ja-JP")}（30秒ごとに自動保存されます）
        </p>
      </div>

      {/* 検索・フィルタ */}
      <div className="sticky top-0 z-10 space-y-2 rounded border border-gray-200 bg-white p-3 shadow-sm">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="商品名・カラー・サイズで絞り込み"
          className="w-full rounded border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
        />
        <div className="flex gap-2 text-xs">
          {([
            ["all", `全て（${stats.total}）`],
            ["unentered", `未入力（${stats.total - stats.entered}）`],
            ["diff", `差異あり（${stats.diffCount}）`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1.5 font-medium ${
                filter === key ? "bg-gray-900 text-white" : "border border-gray-300 bg-white text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 入力行 */}
      <div className="space-y-2">
        {rows.map((l) => {
          const key = keyOf(l);
          const v = values[key];
          const raw = (v?.actual ?? "").trim();
          const entered = raw !== "";
          const diff = entered ? Number(raw) - l.theoretical : 0;
          return (
            <div
              key={key}
              className={`rounded border bg-white p-3 ${
                !entered ? "border-gray-200" : diff === 0 ? "border-green-200 bg-green-50/40" : "border-orange-300 bg-orange-50/40"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{l.goodsName}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{variantLabel(l)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">システム在庫</p>
                  <p className="text-sm font-semibold text-gray-700 tabular-nums">{l.theoretical}個</p>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={v?.actual ?? ""}
                  onChange={(e) => setRow(key, { actual: e.target.value })}
                  placeholder="実数"
                  className="w-24 rounded border border-gray-300 px-3 py-2 text-lg font-semibold tabular-nums focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setRow(key, { actual: String(l.theoretical), reason: "" })}
                  className="rounded border border-gray-300 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                >
                  一致
                </button>
                {entered && (
                  <span className={`text-sm font-bold tabular-nums ${
                    diff === 0 ? "text-green-600" : diff > 0 ? "text-blue-600" : "text-red-600"
                  }`}>
                    {diff === 0 ? "✓ 一致" : `差異 ${diff > 0 ? "+" : ""}${diff}個`}
                  </span>
                )}
              </div>

              {entered && diff !== 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    value={v?.reason ?? ""}
                    onChange={(e) => setRow(key, { reason: e.target.value })}
                    className="rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">— 差異の理由を選択 —</option>
                    {DIFF_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={v?.memo ?? ""}
                    onChange={(e) => setRow(key, { memo: e.target.value })}
                    placeholder="メモ（任意）"
                    className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="rounded border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
            該当する商品がありません。
          </p>
        )}
      </div>

      {/* 固定フッター */}
      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link href="/stocktake" className="hidden shrink-0 text-sm text-gray-500 hover:text-gray-700 sm:block">
            ← 一覧
          </Link>
          <button
            type="button"
            onClick={() => save()}
            disabled={isPending}
            className="flex-1 rounded border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isPending ? "処理中..." : "途中保存"}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={isPending || stats.entered === 0}
            className="flex-1 rounded bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            確定して在庫に反映
          </button>
        </div>
      </div>
    </div>
  );
}
