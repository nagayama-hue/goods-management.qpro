import Link from "next/link";
import { getAllEvents } from "@/lib/eventStore";
import { updateActualAction } from "./actions";
import { formatCurrency } from "@/lib/format";
import { getEventStatus } from "@/lib/eventAnalytics";
import { calcPct } from "@/lib/ecAnalytics";
import type { EventTarget, EventType } from "@/types/event";

interface Props {
  searchParams: Promise<{ type?: string }>;
}

const TYPE_BADGE: Record<EventType, string> = {
  "主催大会": "bg-blue-100 text-blue-700",
  "イベント": "bg-orange-100 text-orange-700",
};

const FILTER_TABS: { label: string; value: string | undefined }[] = [
  { label: "全て",     value: undefined      },
  { label: "主催大会", value: "主催大会"      },
  { label: "イベント", value: "イベント"      },
];

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}


export default async function EventsPage({ searchParams }: Props) {
  const { type: typeFilter } = await searchParams;

  const allEvents = getAllEvents()
    .filter((ev) => !typeFilter || ev.type === (typeFilter as EventType))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 月ごとにグループ化
  const grouped = new Map<string, EventTarget[]>();
  for (const ev of allEvents) {
    const ym = ev.date.slice(0, 7);
    if (!grouped.has(ym)) grouped.set(ym, []);
    grouped.get(ym)!.push(ev);
  }
  const months = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));

  const totalTarget    = allEvents.reduce((s, e) => s + e.target, 0);
  const doneEvents     = allEvents.filter((e) => e.actual !== undefined);
  const totalActual    = doneEvents.reduce((s, e) => s + (e.actual ?? 0), 0);
  const completedCount = doneEvents.length;
  const achievePct     = totalTarget > 0 ? Math.round(totalActual / totalTarget * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">大会・イベント管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            大会・イベントごとの売上目標と実績を管理します。
            大会後に実績を入力してください。
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-400">年間目標合計</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">
              {formatCurrency(totalTarget)}
            </p>
          </div>
          <Link
            href="/events/new"
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            ＋ 新規登録
          </Link>
        </div>
      </div>

      {/* タブナビ */}
      <div className="flex gap-1 border-b border-gray-200">
        <Link
          href="/events"
          className="border-b-2 border-gray-900 px-4 py-2 text-sm font-medium text-gray-900"
        >
          大会管理
        </Link>
        <Link
          href="/events/results"
          className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          実績管理
        </Link>
      </div>

      {/* フィルタータブ */}
      <div className="flex gap-2">
        {FILTER_TABS.map(({ label, value }) => {
          const active = (!typeFilter && !value) || typeFilter === value;
          const href   = value ? `/events?type=${value}` : "/events";
          return (
            <Link
              key={label}
              href={href}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                active
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* 月別リスト */}
      {months.length === 0 ? (
        <div className="rounded border border-dashed border-gray-300 py-20 text-center text-sm text-gray-400">
          大会・イベントが登録されていません。
          <br />
          <Link
            href="/events/new"
            className="mt-3 inline-block text-blue-500 hover:underline"
          >
            ＋ 新規登録から追加する
          </Link>
        </div>
      ) : (
      <div className="space-y-5">
        {months.map(([ym, events]) => {
          const monthTarget  = events.reduce((s, e) => s + e.target, 0);
          const monthDone    = events.filter((e) => e.actual !== undefined);
          const monthActual  = monthDone.reduce((s, e) => s + (e.actual ?? 0), 0);
          const monthPct     = monthTarget > 0 && monthDone.length > 0
            ? Math.round(monthActual / monthTarget * 100) : null;

          return (
            <section
              key={ym}
              className="overflow-hidden rounded border border-gray-200 bg-white"
            >
              {/* 月ヘッダー */}
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                <h2 className="text-sm font-semibold text-gray-700">
                  {formatMonthLabel(ym)}
                </h2>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>
                    目標{" "}
                    <span className="font-medium text-gray-700 tabular-nums">
                      {formatCurrency(monthTarget)}
                    </span>
                  </span>
                  {monthDone.length > 0 && (
                    <span>
                      実績{" "}
                      <span className="font-medium text-gray-700 tabular-nums">
                        {formatCurrency(monthActual)}
                      </span>
                    </span>
                  )}
                  {monthPct !== null && (
                    <span className={`font-semibold ${monthPct >= 100 ? "text-green-600" : "text-blue-600"}`}>
                      {monthPct}%
                    </span>
                  )}
                </div>
              </div>

              {/* イベントテーブル */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-4 py-2 font-medium text-gray-400">日付</th>
                      <th className="px-4 py-2 font-medium text-gray-400">種別</th>
                      <th className="px-4 py-2 font-medium text-gray-400">大会・イベント名</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-400">動員目標</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-400">売上目標</th>
                      <th className="px-4 py-2 font-medium text-gray-400">実績入力（動員／売上）</th>
                      <th className="px-4 py-2 font-medium text-gray-400">状態</th>
                      <th className="px-4 py-2 font-medium text-gray-400"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {events.map((ev) => {
                      const status = getEventStatus(ev);
                      const diff   = ev.actual !== undefined ? ev.actual - ev.target : null;
                      const pct    = ev.actual !== undefined ? calcPct(ev.actual, ev.target) : null;
                      const today  = new Date().toISOString().slice(0, 10);

                      const rowBg =
                        ev.actual !== undefined
                          ? pct !== null && pct < 50 ? "bg-red-50"
                          : pct !== null && pct < 80 ? "bg-yellow-50"
                          : "bg-green-50/40"
                        : ev.date < today ? "bg-orange-50/40"  // 過去かつ未入力
                        : "bg-white";

                      return (
                        <tr
                          key={ev.id}
                          className={`${rowBg} hover:bg-gray-50`}
                        >
                          <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">
                            {formatDate(ev.date)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_BADGE[ev.type]}`}>
                              {ev.type}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-gray-800">
                            {ev.name}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">
                            {ev.capacity ? `${ev.capacity.toLocaleString()}人` : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-700">
                            {formatCurrency(ev.target)}
                          </td>
                          <td className="px-4 py-2.5">
                            <form action={updateActualAction} className="flex items-center gap-1.5">
                              <input type="hidden" name="id" value={ev.id} />
                              {ev.capacity !== undefined && (
                                <input
                                  type="number"
                                  name="actualCapacity"
                                  defaultValue={ev.actualCapacity ?? ""}
                                  min={0}
                                  step={1}
                                  placeholder="動員数"
                                  className="w-20 rounded border border-gray-200 px-2 py-1 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-400"
                                />
                              )}
                              <input
                                type="number"
                                name="actual"
                                defaultValue={ev.actual ?? ""}
                                min={0}
                                step={100}
                                placeholder="売上実績"
                                className="w-28 rounded border border-gray-200 px-2 py-1 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-400"
                              />
                              <button
                                type="submit"
                                className="shrink-0 rounded border border-gray-200 px-2 py-1 text-gray-500 hover:border-gray-400 hover:text-gray-700"
                              >
                                保存
                              </button>
                            </form>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs ${status.cls}`}>{status.label}</span>
                            {diff !== null && (
                              <span className={`ml-1.5 text-xs ${diff >= 0 ? "text-green-600" : "text-red-500"}`}>
                                {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <Link
                              href={`/events/${ev.id}/edit`}
                              className="text-xs text-gray-400 hover:text-blue-600 hover:underline"
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
            </section>
          );
        })}
      </div>
      )}

      {/* 年間合計 */}
      <div className="rounded border border-gray-200 bg-gray-50 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500">年間目標合計</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">
              {formatCurrency(totalTarget)}
            </p>
          </div>
          {completedCount > 0 && (
            <div>
              <p className="text-xs text-gray-500">
                実績合計（{completedCount}/{allEvents.length}件入力済み）
              </p>
              <p className="text-xl font-bold text-blue-700 tabular-nums">
                {formatCurrency(totalActual)}
              </p>
            </div>
          )}
          <div className="text-sm">
            {completedCount === 0 ? (
              <span className="text-gray-400">実績未入力</span>
            ) : (
              <span className={`font-bold ${achievePct >= 100 ? "text-green-600" : "text-gray-700"}`}>
                達成率 {achievePct}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
