import type { AggregateRow } from "@/lib/aggregations";
import { formatCurrency, formatMargin, formatNumber } from "@/lib/format";

interface Props {
  rows: AggregateRow[];
  keyLabel: string;
}

export default function AggregateTable({ rows, keyLabel }: Props) {
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
            <th className="px-3 py-2 text-left font-medium">{keyLabel}</th>
            <th className="px-3 py-2 text-right font-medium">商品数</th>
            <th className="px-3 py-2 text-right font-medium">売上</th>
            <th className="px-3 py-2 text-right font-medium">合計コスト</th>
            <th className="px-3 py-2 text-right font-medium">粗利</th>
            <th className="px-3 py-2 text-right font-medium">粗利率</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-800">{row.key}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                {formatNumber(row.count)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                {formatCurrency(row.revenue)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                {formatCurrency(row.totalCost)}
              </td>
              <td
                className={`px-3 py-2 text-right tabular-nums font-medium ${
                  row.grossProfit >= 0 ? "text-green-700" : "text-red-600"
                }`}
              >
                {formatCurrency(row.grossProfit)}
              </td>
              <td
                className={`px-3 py-2 text-right tabular-nums ${
                  row.grossMargin >= 0.3
                    ? "text-green-700"
                    : row.grossMargin >= 0
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {formatMargin(row.grossMargin)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
