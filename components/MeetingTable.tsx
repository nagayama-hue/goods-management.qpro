"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateGoodsFields } from "@/app/meeting/actions";
import { PRIORITY_OPTIONS, PRIORITY_STYLES } from "@/lib/constants";
import { isAiSuggested } from "@/lib/parseAiMemo";
import { formatCurrency } from "@/lib/format";
import EvaluationBadge from "@/components/EvaluationBadge";
import ScoreBadge from "@/components/ScoreBadge";
import type {
  GoodsCalculated,
  GoodsEvaluation,
  GoodsStatus,
  Priority,
} from "@/types/goods";
import type { GoodsScore } from "@/types/score";

// ─── 型 ────────────────────────────────────────────────────────────────────

interface Row {
  goods: GoodsCalculated;
  evaluation: GoodsEvaluation;
}

interface Props {
  rows:   Row[];
  scores: Record<string, GoodsScore>;
}

type SaveState = "idle" | "saving" | "saved" | "error";

interface RowOverride {
  priority: Priority;
  status: GoodsStatus;
  saveState: SaveState;
}

// ─── 定数 ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: GoodsStatus[] = [
  "案出し中", "検討中", "採用", "制作中", "発売中", "完売", "終了",
];

const STATUS_SELECT_STYLES: Record<GoodsStatus, string> = {
  案出し中: "bg-gray-100 text-gray-600",
  検討中:   "bg-purple-100 text-purple-700",
  採用:     "bg-blue-100 text-blue-700",
  制作中:   "bg-yellow-100 text-yellow-700",
  発売中:   "bg-green-100 text-green-700",
  完売:     "bg-teal-100 text-teal-700",
  終了:     "bg-slate-100 text-slate-500",
};

// ─── ヘルパー ───────────────────────────────────────────────────────────────

function rowBg(priority: Priority, evalLevel: GoodsEvaluation["level"]): string {
  if (priority === "却下") return "bg-gray-50 opacity-60";
  if (evalLevel === "NG") return "bg-red-50";
  if (priority === "今すぐ作る" && evalLevel === "OK") return "bg-green-50";
  return "bg-white";
}

function rowRing(saveState: SaveState): string {
  switch (saveState) {
    case "saving": return "outline outline-1 outline-blue-300";
    case "saved":  return "outline outline-2 outline-green-400";
    case "error":  return "outline outline-2 outline-red-400";
    default:       return "";
  }
}

function inventoryRateColor(rate: number): string {
  if (rate >= 0.5) return "text-red-600 font-medium";
  if (rate >= 0.2) return "text-yellow-600";
  return "text-green-700";
}

// ─── コンポーネント ─────────────────────────────────────────────────────────

export default function MeetingTable({ rows, scores }: Props) {
  // 楽観的更新用オーバーライド（サーバー再レンダリング前に画面を即時更新）
  const [overrides, setOverrides] = useState<Record<string, RowOverride>>({});
  const [, startTransition] = useTransition();

  // 保存完了後 2 秒で idle に戻す
  function resetSaveState(id: string) {
    setTimeout(() => {
      setOverrides((prev) => {
        if (!prev[id]) return prev;
        return { ...prev, [id]: { ...prev[id], saveState: "idle" } };
      });
    }, 2000);
  }

  function handleChange(
    id: string,
    field: "priority" | "status",
    value: Priority | GoodsStatus,
    current: RowOverride
  ) {
    // 楽観的に即時更新
    const next: RowOverride = { ...current, [field]: value, saveState: "saving" };
    setOverrides((prev) => ({ ...prev, [id]: next }));

    startTransition(async () => {
      const result = await updateGoodsFields(id, { [field]: value });
      setOverrides((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          saveState: result.ok ? "saved" : "error",
        },
      }));
      resetSaveState(id);
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded border border-dashed border-gray-300 py-16 text-center text-sm text-gray-400">
        条件に一致する商品がありません。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-gray-200 bg-gray-50 text-left">
            <th className="px-3 py-2 font-medium text-gray-500">商品名</th>
            <th className="px-3 py-2 font-medium text-gray-500">企画優先度</th>
            <th className="px-3 py-2 font-medium text-gray-500">ステータス</th>
            <th className="px-3 py-2 font-medium text-gray-500">評価</th>
            <th className="px-3 py-2 font-medium text-gray-500">カテゴリ</th>
            <th className="px-3 py-2 font-medium text-gray-500">ターゲット</th>
            <th className="px-3 py-2 font-medium text-gray-500">チャネル</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500">予定価格</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500">想定粗利</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500">スコア</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500">在庫率</th>
            <th className="w-8 px-2 py-2 font-medium text-gray-500" aria-label="保存状態" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ goods: g, evaluation: ev }) => {
            const override = overrides[g.id];
            const priority  = override?.priority  ?? g.priority;
            const status    = override?.status    ?? g.status;
            const saveState = override?.saveState ?? "idle";
            const currentOverride: RowOverride = { priority, status, saveState };

            const isAi     = isAiSuggested(g.memo);
            const itemScore = scores[g.id];
            const inventoryRate =
              g.sales.productionCount > 0
                ? g.stockCount / g.sales.productionCount
                : 0;
            const inventoryRateStr =
              g.sales.productionCount > 0
                ? `${(inventoryRate * 100).toFixed(0)}%`
                : "—";

            return (
              <tr
                key={g.id}
                className={`${rowBg(priority, ev.level)} ${rowRing(saveState)} hover:brightness-95 transition-all`}
              >
                {/* 商品名 */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/goods/${g.id}`}
                      className="font-medium text-blue-600 hover:underline whitespace-nowrap"
                    >
                      {g.name}
                    </Link>
                    {isAi && (
                      <span className="shrink-0 rounded bg-purple-100 px-1 py-0.5 text-xs font-medium text-purple-700">
                        AI
                      </span>
                    )}
                  </div>
                </td>

                {/* 企画優先度セレクト */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <select
                    value={priority}
                    disabled={saveState === "saving"}
                    onChange={(e) =>
                      handleChange(g.id, "priority", e.target.value as Priority, currentOverride)
                    }
                    className={`rounded px-2 py-0.5 text-xs font-medium cursor-pointer
                      border-0 focus:outline-none focus:ring-1 focus:ring-offset-0
                      disabled:cursor-not-allowed disabled:opacity-50
                      ${PRIORITY_STYLES[priority]}`}
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </td>

                {/* ステータスセレクト */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <select
                    value={status}
                    disabled={saveState === "saving"}
                    onChange={(e) =>
                      handleChange(g.id, "status", e.target.value as GoodsStatus, currentOverride)
                    }
                    className={`rounded px-2 py-0.5 text-xs font-medium cursor-pointer
                      border-0 focus:outline-none focus:ring-1 focus:ring-offset-0
                      disabled:cursor-not-allowed disabled:opacity-50
                      ${STATUS_SELECT_STYLES[status]}`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>

                {/* 評価 */}
                <td className="px-3 py-2">
                  <div>
                    <EvaluationBadge level={ev.level} />
                    {ev.reasons.length > 0 && (
                      <div className="mt-0.5 text-xs text-gray-400">
                        {ev.reasons.join("・")}
                      </div>
                    )}
                  </div>
                </td>

                {/* カテゴリ */}
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{g.category}</td>

                {/* ターゲット */}
                <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">{g.target || "—"}</td>

                {/* チャネル */}
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{g.salesChannel}</td>

                {/* 価格 */}
                <td className="px-3 py-2 text-right tabular-nums text-gray-700 whitespace-nowrap">
                  {formatCurrency(g.sales.sellingPrice)}
                </td>

                {/* 粗利 */}
                <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap font-medium ${
                  g.grossProfit >= 0 ? "text-green-700" : "text-red-600"
                }`}>
                  {formatCurrency(g.grossProfit)}
                </td>

                {/* スコア */}
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {itemScore ? (
                    <ScoreBadge score={itemScore.score} level={itemScore.level} size="sm" />
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>

                {/* 在庫率 */}
                <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${inventoryRateColor(inventoryRate)}`}>
                  {inventoryRateStr}
                </td>

                {/* 保存状態インジケーター */}
                <td className="px-2 py-2 text-center w-8">
                  {saveState === "saving" && (
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400" title="保存中..." />
                  )}
                  {saveState === "saved" && (
                    <span className="text-green-500 text-sm leading-none" title="保存しました">✓</span>
                  )}
                  {saveState === "error" && (
                    <span className="text-red-500 text-sm leading-none" title="保存に失敗しました">!</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
