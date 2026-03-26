import Link from "next/link";
import { getAllEvents } from "@/lib/eventStore";
import {
  buildAnnualStats,
  buildMonthStats,
  getEventStatus,
} from "@/lib/eventAnalytics";
import {
  calcPct,
  calcGap,
  achieveBadgeClass,
  achieveTextColor,
  achieveBg,
  progressWidth,
  progressBarColor,
} from "@/lib/ecAnalytics";
import { formatCurrency } from "@/lib/format";
import type { EventType } from "@/types/event";

interface Props {
  searchParams: Promise<{ type?: string }>;
}

const TYPE_BADGE: Record<EventType, string> = {
  主催大会: "bg-blue-100 text-blue-700",
  イベント: "bg-orange-100 text-orange-700",
};

const FILTER_TABS: { label: string; value: string | undefined }[] = [
  { label: "全て",     value: undefined  },
  { label: "主催大会", value: "主催大会" },
  { label: "イベント", value: "イベント" },
];

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

export default async function EventResultsPage({ searchParams }: Props) {
  const { type: typeFilter } = await searchParams;

  const allEvents = getAllEvents()
    .filter((ev) => !typeFilter || ev.type === (typeFilter as EventType))
    .sort((a, b) => a.date.localeCompare(b.date));

  const annual     = buildAnnualStats(allEvents);
  const monthStats = buildMonthStats(allEvents);

  const salesPct = annual.salesActual !== null
    ? calcPct(annual.salesActual, annual.salesTarget)
    : null;
  const capPct   = annual.capacityActual !== null && annual.capacityTarget > 0
    ? calcPct(annual.capacityActual, annual.capacityTarget)
    : null;
  const salesGap = calcGap(annual.salesActual ?? 0, annual.salesTarget);
  const capGap   = calcGap(annual.capacityActual ?? 0, annual.capacityTarget);

  const todayYm = new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">大会・イベント管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            大会・イベントごとの達成率と実績を確認します。
          </p>
        </div>
        <Link
          href="/events/new"
          className="shrink-0 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          ＋ 新規登録
        </Link>
      </div>

      {/* タブナビ */}
      <div className="flex gap-1 border-b border-gray-200">
        <Link
          href="/events"
          className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          大会管理
        </Link>
        <Link
          href="/events/results"
          className="border-b-2 border-gray-900 px-4 py-2 text-sm font-medium text-gray-900"
        >
          実績管理
        </Link>
      </div>

      {/* フィルタータブ */}
      <div className="flex gap-2">
        {FILTER_TABS.map(({ label, value }) => {
          const active = (!typeFilter && !value) || typeFilter === value;
          const href   = value
            ? `/events/results?type=${encodeURIComponent(value)}`
            : "/events/results";
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

      {/* ── Section A: 年間サマリー ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">年間サマリー</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* 売上カード */}
          <div className="space-y-2 rounded border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">売上</p>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400">目標</p>
                <p className="text-lg font-bold text-gray-900 tabular-nums">
                  {formatCurrency(annual.salesTarget)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">
                  実績（{annual.salesDoneCount}/{annual.totalCount}件）
                </p>
                <p
                  className={`text-lg font-bold tabular-nums ${
                    annual.salesActual !== null ? "text-blue-700" : "text-gray-300"
                  }`}
                >
                  {annual.salesActual !== null
                    ? formatCurrency(annual.salesActual)
                    : "—"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {salesPct !== null ? (
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-sm font-bold ${achieveBadgeClass(salesPct)}`}
                  >
                    {salesPct}%
                  </span>
                ) : (
                  <span className="text-sm text-gray-300">—</span>
                )}
              </div>
            </div>
            {/* プログレスバー */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all ${progressBarColor(salesPct)}`}
                style={{ width: `${progressWidth(salesPct)}%` }}
              />
            </div>
            {salesPct !== null && salesGap > 0 && (
              <p className="text-xs text-red-500">
                不足額 {formatCurrency(salesGap)}
              </p>
            )}
          </div>

          {/* 動員カード */}
          <div className="space-y-2 rounded border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">動員</p>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400">目標</p>
                <p className="text-lg font-bold text-gray-900 tabular-nums">
                  {annual.capacityTarget > 0
                    ? `${annual.capacityTarget.toLocaleString()}人`
                    : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">
                  実績（{annual.capDoneCount}件）
                </p>
                <p
                  className={`text-lg font-bold tabular-nums ${
                    annual.capacityActual !== null ? "text-blue-700" : "text-gray-300"
                  }`}
                >
                  {annual.capacityActual !== null
                    ? `${annual.capacityActual.toLocaleString()}人`
                    : "—"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {capPct !== null ? (
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-sm font-bold ${achieveBadgeClass(capPct)}`}
                  >
                    {capPct}%
                  </span>
                ) : (
                  <span className="text-sm text-gray-300">—</span>
                )}
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all ${progressBarColor(capPct)}`}
                style={{ width: `${progressWidth(capPct)}%` }}
              />
            </div>
            {capPct !== null && capGap > 0 && (
              <p className="text-xs text-red-500">
                不足人数 {capGap.toLocaleString()}人
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Section B: 月別集計 ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">月別集計</h2>
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-2.5 font-medium text-gray-500">月</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-500">
                  動員目標
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-500">
                  実績動員
                </th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-500">
                  動員達成率
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-500">
                  売上目標
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-500">
                  実績売上
                </th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-500">
                  売上達成率
                </th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-500">
                  件数
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthStats.map((ms) => {
                const sPct = ms.salesActual !== null
                  ? calcPct(ms.salesActual, ms.salesTarget)
                  : null;
                const cPct = ms.capacityActual !== null && ms.capacityTarget > 0
                  ? calcPct(ms.capacityActual, ms.capacityTarget)
                  : null;
                const isCurrent = ms.ym === todayYm;

                return (
                  <tr
                    key={ms.ym}
                    className={isCurrent ? "bg-blue-50/50" : "hover:bg-gray-50"}
                  >
                    <td
                      className={`whitespace-nowrap px-4 py-2.5 font-medium ${
                        isCurrent ? "text-blue-700" : "text-gray-700"
                      }`}
                    >
                      {formatMonthLabel(ms.ym)}
                      {isCurrent && (
                        <span className="ml-1.5 text-xs font-normal text-blue-400">
                          今月
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">
                      {ms.capacityTarget > 0
                        ? `${ms.capacityTarget.toLocaleString()}人`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                      {ms.capacityActual !== null
                        ? `${ms.capacityActual.toLocaleString()}人`
                        : "—"}
                    </td>
                    <td className={`px-4 py-2.5 text-center ${achieveBg(cPct)}`}>
                      {cPct !== null ? (
                        <span className={`font-semibold ${achieveTextColor(cPct)}`}>
                          {cPct}%
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">
                      {formatCurrency(ms.salesTarget)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                      {ms.salesActual !== null
                        ? formatCurrency(ms.salesActual)
                        : "—"}
                    </td>
                    <td className={`px-4 py-2.5 text-center ${achieveBg(sPct)}`}>
                      {sPct !== null ? (
                        <span className={`font-semibold ${achieveTextColor(sPct)}`}>
                          {sPct}%
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-gray-400">
                      {ms.salesDoneCount}/{ms.eventCount}件
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section C: 大会ごとの実績一覧 ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          大会ごとの実績一覧
        </h2>
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-2.5 font-medium text-gray-500">日付</th>
                <th className="px-4 py-2.5 font-medium text-gray-500">種別</th>
                <th className="px-4 py-2.5 font-medium text-gray-500">大会・イベント名</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-500">
                  動員目標
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-500">
                  実績動員
                </th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-500">
                  動員達成率
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-500">
                  売上目標
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-500">
                  実績売上
                </th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-500">
                  売上達成率
                </th>
                <th className="px-4 py-2.5 font-medium text-gray-500">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allEvents.map((ev) => {
                const status = getEventStatus(ev);
                const sPct =
                  ev.actual !== undefined
                    ? calcPct(ev.actual, ev.target)
                    : null;
                const cPct =
                  ev.actualCapacity !== undefined && ev.capacity
                    ? calcPct(ev.actualCapacity, ev.capacity)
                    : null;

                return (
                  <tr
                    key={ev.id}
                    className={
                      ev.actual !== undefined
                        ? "bg-green-50/30"
                        : "hover:bg-gray-50"
                    }
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">
                      {formatDate(ev.date)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_BADGE[ev.type]}`}
                      >
                        {ev.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">
                      {ev.name}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">
                      {ev.capacity
                        ? `${ev.capacity.toLocaleString()}人`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                      {ev.actualCapacity !== undefined
                        ? `${ev.actualCapacity.toLocaleString()}人`
                        : "—"}
                    </td>
                    <td className={`px-4 py-2.5 text-center ${achieveBg(cPct)}`}>
                      {cPct !== null ? (
                        <span
                          className={`font-semibold ${achieveTextColor(cPct)}`}
                        >
                          {cPct}%
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">
                      {formatCurrency(ev.target)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                      {ev.actual !== undefined
                        ? formatCurrency(ev.actual)
                        : "—"}
                    </td>
                    <td className={`px-4 py-2.5 text-center ${achieveBg(sPct)}`}>
                      {sPct !== null ? (
                        <span
                          className={`font-semibold ${achieveTextColor(sPct)}`}
                        >
                          {sPct}%
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
