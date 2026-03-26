import Link from "next/link";
import type { MonthlyAggregate } from "@/lib/aggregations";
import { formatCurrency, formatMargin, formatNumber } from "@/lib/format";

interface Props {
  rows: MonthlyAggregate[];
}

function MarginCell({ value }: { value: number }) {
  const color =
    value >= 0.3 ? "text-green-700" :
    value >= 0   ? "text-yellow-600" : "text-red-600";
  return (
    <td className={`px-3 py-2.5 text-right tabular-nums ${color}`}>
      {formatMargin(value)}
    </td>
  );
}

function InventoryRateCell({ value }: { value: number }) {
  const color =
    value <= 0.2 ? "text-green-700" :
    value <= 0.5 ? "text-yellow-600" : "text-red-600";
  return (
    <td className={`px-3 py-2.5 text-right tabular-nums ${color}`}>
      {formatMargin(value)}
    </td>
  );
}

export default function MonthlyAnalysisTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-400">データがありません。</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
            <th className="px-3 py-2 text-left font-medium">月</th>
            <th className="px-3 py-2 text-right font-medium">商品数</th>
            <th className="px-3 py-2 text-right font-medium">売上</th>
            <th className="px-3 py-2 text-right font-medium">粗利</th>
            <th className="px-3 py-2 text-right font-medium">粗利率</th>
            <th className="px-3 py-2 text-right font-medium">在庫数</th>
            <th className="px-3 py-2 text-right font-medium">在庫率</th>
            <th className="px-3 py-2 text-right font-medium">HIT</th>
            <th className="px-3 py-2 text-right font-medium">NG</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.month} className="hover:bg-gray-50">
              <td className="px-3 py-2.5">
                {row.month === "未設定" ? (
                  <span className="text-gray-400">未設定</span>
                ) : (
                  <Link
                    href={`/analytics/month/${encodeURIComponent(row.month)}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {row.month}
                  </Link>
                )}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">
                {row.count}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                {formatCurrency(row.revenue)}
              </td>
              <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${
                row.totalGrossProfit >= 0 ? "text-green-700" : "text-red-600"
              }`}>
                {formatCurrency(row.totalGrossProfit)}
              </td>
              <MarginCell value={row.avgGrossMargin} />
              <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">
                {formatNumber(row.totalStockCount)}
              </td>
              <InventoryRateCell value={row.avgInventoryRate} />
              <td className="px-3 py-2.5 text-right tabular-nums">
                {row.hitCount > 0 ? (
                  <span className="font-medium text-green-700">{row.hitCount}</span>
                ) : (
                  <span className="text-gray-400">0</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {row.ngCount > 0 ? (
                  <span className="font-medium text-red-600">{row.ngCount}</span>
                ) : (
                  <span className="text-gray-400">0</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
