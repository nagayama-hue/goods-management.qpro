import Link from "next/link";
import { getAllMeetings } from "@/lib/meetingStore";
import type { MeetingResult } from "@/types/meeting";

const RESULT_TEXT_STYLES: Record<MeetingResult, string> = {
  採用:     "text-blue-600 font-medium",
  保留:     "text-yellow-600",
  却下:     "text-gray-400",
  継続検討: "text-purple-600",
};

export default function MeetingHistoryPage() {
  const meetings = getAllMeetings().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">会議履歴</h1>
          <p className="mt-1 text-sm text-gray-500">
            過去に記録した会議の一覧です。
          </p>
        </div>
        <Link href="/meeting" className="shrink-0 text-sm text-gray-400 hover:text-gray-700">
          ← 会議ビュー
        </Link>
      </div>

      {meetings.length === 0 ? (
        <div className="rounded border border-dashed border-gray-300 py-20 text-center text-sm text-gray-400">
          まだ会議が記録されていません。
          <br />
          <Link
            href="/meeting"
            className="mt-3 inline-block text-blue-500 hover:underline"
          >
            会議ビューから記録する
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {meetings.map((m) => {
            const counts: Record<MeetingResult, number> = {
              採用:     m.items.filter((i) => i.result === "採用").length,
              保留:     m.items.filter((i) => i.result === "保留").length,
              却下:     m.items.filter((i) => i.result === "却下").length,
              継続検討: m.items.filter((i) => i.result === "継続検討").length,
            };
            const nonZero = (["採用", "継続検討", "保留", "却下"] as MeetingResult[]).filter(
              (r) => counts[r] > 0
            );

            return (
              <Link
                key={m.id}
                href={`/meeting/history/${m.id}`}
                className="block rounded border border-gray-200 bg-white px-5 py-4 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">{m.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {m.date} &middot; {m.items.length} 件
                    </p>
                  </div>
                  {nonZero.length > 0 && (
                    <div className="flex shrink-0 gap-3 text-xs">
                      {nonZero.map((r) => (
                        <span key={r} className={RESULT_TEXT_STYLES[r]}>
                          {r} {counts[r]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {m.memo && (
                  <p className="mt-1.5 text-xs text-gray-400 truncate">{m.memo}</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
