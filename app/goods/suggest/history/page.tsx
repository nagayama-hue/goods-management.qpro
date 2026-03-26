import Link from "next/link";
import { getAllHistory } from "@/lib/historyStore";

const MODE_LABELS: Record<string, string> = {
  data:       "データ分析",
  free:       "自由発想",
  monthly:    "月次提案",
  derivative: "派生提案",
};

const MODE_STYLES: Record<string, string> = {
  data:       "bg-blue-100 text-blue-700",
  free:       "bg-purple-100 text-purple-700",
  monthly:    "bg-indigo-100 text-indigo-700",
  derivative: "bg-green-100 text-green-700",
};

function conditionSummary(history: ReturnType<typeof getAllHistory>[number]): string {
  if (!history.conditions) return "条件なし";
  const c = history.conditions;
  const parts: string[] = [];
  if (c.categories.length > 0) parts.push(c.categories.join("・"));
  if (c.target)     parts.push(c.target);
  if (c.channel)    parts.push(c.channel);
  if (c.priceRange) parts.push(c.priceRange);
  return parts.length > 0 ? parts.join(" / ") : "条件なし";
}

export default function SuggestionHistoryListPage() {
  const histories = getAllHistory();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">AI提案履歴</h1>
          <p className="mt-1 text-sm text-gray-500">
            過去に保存したAI提案セッションの一覧です。
          </p>
        </div>
        <Link
          href="/goods/suggest"
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 新しい提案を生成
        </Link>
      </div>

      {histories.length === 0 ? (
        <div className="rounded border border-dashed border-gray-300 py-16 text-center text-sm text-gray-400">
          まだ保存された提案がありません。<br />
          <Link href="/goods/suggest" className="mt-2 inline-block text-blue-600 hover:underline">
            AI案出しページで提案を生成して保存してください。
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs">
                <th className="px-3 py-2 text-left font-medium text-gray-500">保存日時</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">モード</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">条件</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">提案件数</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">登録済み</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {histories.map((h) => {
                const registeredCount = h.suggestions.filter((s) => s.registeredGoodsId).length;
                const date = new Date(h.createdAt).toLocaleString("ja-JP", {
                  year: "numeric", month: "2-digit", day: "2-digit",
                  hour: "2-digit", minute: "2-digit",
                });
                return (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 tabular-nums text-gray-700">{date}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${MODE_STYLES[h.mode] ?? "bg-gray-100 text-gray-600"}`}>
                        {MODE_LABELS[h.mode] ?? h.mode}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 max-w-xs truncate">
                      {conditionSummary(h)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                      {h.suggestions.length}件
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {registeredCount > 0 ? (
                        <span className="text-green-700 font-medium">{registeredCount}件</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/goods/suggest/history/${h.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        詳細 →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
