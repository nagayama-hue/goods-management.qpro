import { notFound } from "next/navigation";
import Link from "next/link";
import { getMeetingById } from "@/lib/meetingStore";
import { PRIORITY_STYLES } from "@/lib/constants";
import { MEETING_RESULT_STYLES } from "@/types/meeting";
import type { MeetingResult } from "@/types/meeting";

// 絞り込みパラメータの表示ラベル
const FILTER_LABELS: Record<string, string> = {
  priority: "優先度",
  status:   "ステータス",
  eval:     "評価",
  ai:       "AI由来",
};

/** メモテキストを ### 見出し付きでレンダリング */
function MemoView({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div className="space-y-0.5 text-sm">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) {
          return (
            <p key={i} className="mt-4 first:mt-0 font-semibold text-gray-800">
              {line.replace(/^### /, "")}
            </p>
          );
        }
        if (line.trim() === "") {
          return <div key={i} className="h-1" />;
        }
        return (
          <p key={i} className="text-gray-600 leading-relaxed">
            {line}
          </p>
        );
      })}
    </div>
  );
}

interface Props {
  params:       Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}

const RESULT_COUNT_STYLES: Record<MeetingResult, string> = {
  採用:     "text-blue-600",
  保留:     "text-yellow-600",
  却下:     "text-gray-400",
  継続検討: "text-purple-600",
};

const RESULT_ORDER: MeetingResult[] = ["採用", "継続検討", "保留", "却下"];

export default async function MeetingHistoryDetailPage({ params, searchParams }: Props) {
  const { id }    = await params;
  const { saved } = await searchParams;
  const meeting   = getMeetingById(id);
  if (!meeting) notFound();

  const counts: Record<MeetingResult, number> = {
    採用:     meeting.items.filter((i) => i.result === "採用").length,
    保留:     meeting.items.filter((i) => i.result === "保留").length,
    却下:     meeting.items.filter((i) => i.result === "却下").length,
    継続検討: meeting.items.filter((i) => i.result === "継続検討").length,
  };

  // 結果ごとにグループ化（件数がある順）
  const grouped = RESULT_ORDER
    .map((result) => ({
      result,
      items: meeting.items.filter((i) => i.result === result),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {/* 保存完了バナー */}
      {saved === "1" && (
        <div className="flex items-center justify-between rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <span>✓ 会議を記録しました。</span>
          <Link href="/meeting/history" className="text-green-600 hover:underline text-xs">
            会議履歴一覧を見る →
          </Link>
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{meeting.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {meeting.date} &middot; {meeting.items.length} 件
          </p>
          {/* 絞り込み条件の表示 */}
          {meeting.scope === "filtered" && Object.keys(meeting.filterParams ?? {}).length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {Object.entries(meeting.filterParams).map(([key, val]) => (
                <span
                  key={key}
                  className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                >
                  {FILTER_LABELS[key] ?? key}：{key === "ai" ? "AI提案のみ" : val}
                </span>
              ))}
            </div>
          )}
          {meeting.memo && (
            <div className="mt-3 rounded border border-gray-200 bg-white px-4 py-4">
              <MemoView text={meeting.memo} />
            </div>
          )}
        </div>
        <Link
          href="/meeting/history"
          className="shrink-0 text-sm text-gray-400 hover:text-gray-700"
        >
          ← 会議履歴
        </Link>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {RESULT_ORDER.map((r) => (
          <div key={r} className="rounded border border-gray-200 bg-white px-4 py-3 text-center">
            <p className={`text-2xl font-bold ${RESULT_COUNT_STYLES[r]}`}>
              {counts[r]}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">{r}</p>
          </div>
        ))}
      </div>

      {/* 商品一覧（結果ごとにグループ） */}
      {grouped.map(({ result, items }) => (
        <div key={result} className="rounded border border-gray-200 bg-white overflow-hidden">
          {/* グループヘッダー */}
          <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${MEETING_RESULT_STYLES[result]}`}
            >
              {result}
            </span>
            <span className="text-xs text-gray-500">{items.length} 件</span>
          </div>

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-2 font-medium text-gray-500">商品名</th>
                <th className="px-4 py-2 font-medium text-gray-500">優先度</th>
                <th className="px-4 py-2 font-medium text-gray-500">ステータス</th>
                <th className="px-4 py-2 font-medium text-gray-500">コメント</th>
                <th className="px-4 py-2 font-medium text-gray-500" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr key={item.goodsId} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {item.goodsName}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[item.priority]}`}
                    >
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                    {item.status}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 max-w-[240px]">
                    {item.comment || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/goods/${item.goodsId}`}
                      className="text-blue-500 hover:underline"
                    >
                      詳細 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
