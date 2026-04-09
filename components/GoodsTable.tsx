import Link from "next/link";
import type { GoodsCalculated } from "@/types/goods";
import type { GoodsScore } from "@/types/score";
import StatusBadge from "@/components/StatusBadge";
import EvaluationBadge from "@/components/EvaluationBadge";
import PriorityBadge from "@/components/PriorityBadge";
import ScoreBadge from "@/components/ScoreBadge";
import { evaluateGoods } from "@/lib/evaluation";
import { isAiSuggested } from "@/lib/parseAiMemo";
import { formatCurrency, formatNumber } from "@/lib/format";

export type SortKey = "revenue" | "grossProfit" | "stockCount" | "sellingPrice" | "score";
type SortDir = "asc" | "desc";

/** Airレジ連携状態（商品ID → 連携情報） */
export interface AirregiSyncInfo {
  status:              "linked" | "missing" | "unlinked";
  stock?:              number;   // 実在庫数（linked の場合のみ）
  airregiProductCode?: string;   // Airレジ商品コード
  airregiPrice?:       number;   // Airレジ価格
  isVisible?:          boolean;  // Airレジ表示状態
}

interface Props {
  goods:    GoodsCalculated[];
  sortKey:  SortKey;
  sortDir:  SortDir;
  scores:   Record<string, GoodsScore>;
  /** 優先度フィルターが選択中の場合に sort href に付与する */
  planning?: string;
  /** Airレジ連携状態マップ（商品ID → 連携情報） */
  airregiSyncMap?: Record<string, AirregiSyncInfo>;
}

function sortHref(
  col: SortKey,
  current: SortKey,
  dir: SortDir,
  planning?: string
): string {
  const planningParam = planning ? `&planning=${encodeURIComponent(planning)}` : "";
  if (col === current) {
    return `?sort=${col}&dir=${dir === "desc" ? "asc" : "desc"}${planningParam}`;
  }
  return `?sort=${col}&dir=desc${planningParam}`;
}

function SortIcon({ col, current, dir }: { col: SortKey; current: SortKey; dir: SortDir }) {
  if (col !== current) return <span className="ml-1 text-gray-300">↕</span>;
  return <span className="ml-1">{dir === "desc" ? "↓" : "↑"}</span>;
}

function SortableHeader({
  col, label, current, dir, planning, className,
}: {
  col:       SortKey;
  label:     string;
  current:   SortKey;
  dir:       SortDir;
  planning?: string;
  className?: string;
}) {
  const active = col === current;
  return (
    <th className={`px-3 py-2 font-medium ${className ?? ""}`}>
      <Link
        href={sortHref(col, current, dir, planning)}
        className={`inline-flex items-center gap-0.5 hover:text-gray-800 ${
          active ? "text-blue-600" : "text-gray-500"
        }`}
      >
        {label}
        <SortIcon col={col} current={current} dir={dir} />
      </Link>
    </th>
  );
}

export default function GoodsTable({ goods, sortKey, sortDir, scores, planning, airregiSyncMap }: Props) {
  if (goods.length === 0) {
    return (
      <div className="rounded border border-dashed border-gray-300 py-16 text-center text-gray-400">
        商品が登録されていません。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-xs">
            <th className="px-3 py-2 text-left font-medium text-gray-500">商品名</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">企画優先度</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">評価</th>
            <SortableHeader col="score" label="スコア" current={sortKey} dir={sortDir} planning={planning} className="text-right" />
            <th className="px-3 py-2 text-left font-medium text-gray-500">カテゴリ</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">ステータス</th>
            <SortableHeader col="sellingPrice" label="予定販売価格" current={sortKey} dir={sortDir} planning={planning} className="text-right" />
            <th className="px-3 py-2 text-right font-medium text-gray-500">合計コスト</th>
            <SortableHeader col="grossProfit" label="計画利益" current={sortKey} dir={sortDir} planning={planning} className="text-right" />
            <SortableHeader col="stockCount"  label="在庫"    current={sortKey} dir={sortDir} planning={planning} className="text-right" />
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {goods.map((item) => {
            const evaluation  = evaluateGoods(item);
            const itemScore   = scores[item.id];
            const airInfo     = airregiSyncMap?.[item.id];
            const rowBg =
              evaluation.level === "NG"   ? "bg-red-50/40" :
              evaluation.level === "WARN" ? "bg-yellow-50/40" : "";
            return (
              <tr key={item.id} className={`${rowBg} hover:bg-gray-50`}>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link
                      href={`/goods/${item.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {item.name}
                    </Link>
                    {isAiSuggested(item.memo) && (
                      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                        AI
                      </span>
                    )}
                    {airInfo?.status === "linked" && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                        Air✓
                      </span>
                    )}
                    {airInfo?.status === "linked" && airInfo.isVisible === false && (
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-600">
                        非表示
                      </span>
                    )}
                    {airInfo?.status === "missing" && (
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-600">
                        コード未一致
                      </span>
                    )}
                  </div>
                  {/* Airレジ取込情報（コード・価格） */}
                  {airInfo?.status === "linked" && (
                    <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-gray-400">
                      {airInfo.airregiProductCode && (
                        <span>コード: {airInfo.airregiProductCode}</span>
                      )}
                      {airInfo.airregiPrice !== undefined && (
                        <span>Air価格: ¥{airInfo.airregiPrice.toLocaleString()}</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <PriorityBadge priority={item.priority} />
                </td>
                <td className="px-3 py-2">
                  <EvaluationBadge level={evaluation.level} />
                </td>
                <td className="px-3 py-2 text-right">
                  {itemScore ? (
                    <ScoreBadge score={itemScore.score} level={itemScore.level} size="sm" />
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-600">{item.category}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                  {formatCurrency(item.sales.sellingPrice)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                  {formatCurrency(item.totalCost)}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums font-medium ${
                    item.grossProfit >= 0 ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {formatCurrency(item.grossProfit)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {airInfo?.status === "linked" ? (
                    <span className={airInfo.stock === 0 ? "font-medium text-red-600" : airInfo.stock !== undefined && airInfo.stock <= 10 ? "font-medium text-orange-600" : "text-gray-700"}>
                      {formatNumber(airInfo.stock ?? 0)}
                      <span className="ml-1 text-xs text-green-600">実</span>
                    </span>
                  ) : (
                    <span className="text-gray-700">
                      {formatNumber(item.stockCount)}
                      <span className="ml-1 text-xs text-gray-400">予</span>
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/goods/${item.id}/edit`}
                    className="text-xs text-gray-400 hover:text-gray-700"
                  >
                    編集
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
