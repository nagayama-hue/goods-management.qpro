import Link from "next/link";
import { getAllCampaigns } from "@/lib/ecCampaignStore";
import { updateActualAction } from "./actions";
import { formatCurrency } from "@/lib/format";
import {
  calcPct,
  achieveBadgeClass,
  achieveTextColor,
} from "@/lib/ecAnalytics";
import {
  EC_CAMPAIGN_TYPES,
  EC_CAMPAIGN_TYPE_STYLES,
  type EcCampaignType,
} from "@/types/ecCampaign";

interface Props {
  searchParams: Promise<{ type?: string; sort?: string }>;
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

function getStatus(targetMonth: string, actual: number | undefined) {
  const today = new Date().toISOString().slice(0, 7); // YYYY-MM
  if (actual !== undefined)     return { label: "完了",   cls: "text-green-600 font-semibold" };
  if (targetMonth < today)      return { label: "要入力", cls: "text-orange-500 font-semibold" };
  return                               { label: "予定",   cls: "text-gray-400" };
}

export default async function EcCampaignsPage({ searchParams }: Props) {
  const { type: typeFilter, sort } = await searchParams;
  const isRanking = sort === "actual";

  const filtered = getAllCampaigns()
    .filter((c) => !typeFilter || c.type === (typeFilter as EcCampaignType));

  // 表示用ソート：売上順（実績降順）or 日付順
  const all = isRanking
    ? [...filtered].sort((a, b) => (b.actual ?? -1) - (a.actual ?? -1))
    : [...filtered].sort((a, b) => a.targetMonth.localeCompare(b.targetMonth));

  // 月ごとにグループ化（日付順表示時のみ使用）
  const grouped = new Map<string, typeof all>();
  for (const c of [...filtered].sort((a, b) => a.targetMonth.localeCompare(b.targetMonth))) {
    if (!grouped.has(c.targetMonth)) grouped.set(c.targetMonth, []);
    grouped.get(c.targetMonth)!.push(c);
  }
  const months = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));

  // 集計（フィルター済みの全件）
  const totalTarget    = filtered.reduce((s, c) => s + c.target, 0);
  const done           = filtered.filter((c) => c.actual !== undefined);
  const totalActual    = done.reduce((s, c) => s + (c.actual ?? 0), 0);
  const completedCount = done.length;
  const achievePct     = totalTarget > 0 ? Math.round(totalActual / totalTarget * 100) : 0;

  const FILTER_TABS: { label: string; value: string | undefined }[] = [
    { label: "全て", value: undefined },
    ...EC_CAMPAIGN_TYPES.map((t) => ({ label: t, value: t })),
  ];

  // ソートリンク生成ヘルパー
  function sortHref(s: string | undefined) {
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (s) params.set("sort", s);
    const qs = params.toString();
    return qs ? `/ec/campaigns?${qs}` : "/ec/campaigns";
  }

  // フィルターリンク生成ヘルパー
  function typeHref(value: string | undefined) {
    const params = new URLSearchParams();
    if (value) params.set("type", value);
    if (isRanking) params.set("sort", "actual");
    const qs = params.toString();
    return qs ? `/ec/campaigns?${qs}` : "/ec/campaigns";
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">EC企画管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            各EC企画の売上目標と実績を管理します。企画終了後に実績を入力してください。
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {totalTarget > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-400">目標合計</p>
              <p className="text-lg font-bold text-gray-900 tabular-nums">
                {formatCurrency(totalTarget)}
              </p>
            </div>
          )}
          <Link
            href="/ec/campaigns/new"
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            ＋ 新規登録
          </Link>
        </div>
      </div>

      {/* タブナビ */}
      <div className="flex gap-1 border-b border-gray-200">
        <Link href="/ec"           className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800">予算管理表</Link>
        <span className="border-b-2 border-gray-900 px-4 py-2 text-sm font-medium text-gray-900">企画管理</span>
        <Link href="/ec/results"   className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800">実績管理</Link>
      </div>

      {/* フィルター＋ソート */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* 種別フィルター */}
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map(({ label, value }) => {
            const active = (!typeFilter && !value) || typeFilter === value;
            return (
              <Link
                key={label}
                href={typeHref(value)}
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

        {/* 並び替え */}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span className="mr-1">並び替え：</span>
          <Link
            href={sortHref(undefined)}
            className={`rounded px-2.5 py-1 transition-colors ${
              !isRanking
                ? "bg-gray-200 font-medium text-gray-800"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            日付順
          </Link>
          <Link
            href={sortHref("actual")}
            className={`rounded px-2.5 py-1 transition-colors ${
              isRanking
                ? "bg-gray-900 font-medium text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            売上順
          </Link>
        </div>
      </div>

      {/* リスト */}
      {all.length === 0 ? (
        <div className="rounded border border-dashed border-gray-300 py-16 text-center text-sm text-gray-400">
          企画が登録されていません。「＋ 新規登録」から追加してください。
        </div>
      ) : isRanking ? (
        /* ── 売上ランキングビュー ── */
        <div className="overflow-hidden rounded border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <p className="text-sm font-semibold text-gray-700">
              売上ランキング（実績順）
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="w-10 px-4 py-2 text-center font-medium text-gray-400">順位</th>
                  <th className="px-4 py-2 font-medium text-gray-400">企画名</th>
                  <th className="px-4 py-2 font-medium text-gray-400">種別</th>
                  <th className="px-4 py-2 font-medium text-gray-400">対象月</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-400">売上目標</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-400">実績</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-400">達成率</th>
                  <th className="px-4 py-2 font-medium text-gray-400">実績入力</th>
                  <th className="px-4 py-2 font-medium text-gray-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {all.map((c, idx) => {
                  const pct    = calcPct(c.actual ?? 0, c.target);
                  const diff   = c.actual !== undefined ? c.actual - c.target : null;
                  const status = getStatus(c.targetMonth, c.actual);
                  const rank   = c.actual !== undefined ? idx + 1 : null;

                  const rowBg = c.actual !== undefined
                    ? pct !== null && pct < 50 ? "bg-red-50"
                    : pct !== null && pct < 80 ? "bg-yellow-50"
                    : "bg-green-50/40"
                    : "bg-white";

                  return (
                    <tr
                      key={c.id}
                      className={`${rowBg} hover:bg-gray-50`}
                    >
                      <td className="px-4 py-2.5 text-center">
                        {rank !== null ? (
                          <span className={`font-bold tabular-nums ${
                            rank === 1 ? "text-yellow-500" :
                            rank === 2 ? "text-gray-400" :
                            rank === 3 ? "text-orange-400" : "text-gray-400"
                          }`}>
                            #{rank}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">
                        {c.name}
                        {c.memo && (
                          <span className="ml-2 text-xs font-normal text-gray-400">{c.memo}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${EC_CAMPAIGN_TYPE_STYLES[c.type]}`}>
                          {c.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {formatMonthLabel(c.targetMonth)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-700">
                        {formatCurrency(c.target)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                        {c.actual !== undefined ? (
                          <span className={achieveTextColor(pct)}>
                            {formatCurrency(c.actual)}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {c.actual !== undefined && pct !== null ? (
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${achieveBadgeClass(pct)}`}>
                            {pct}%
                          </span>
                        ) : (
                          <span className={`text-xs ${status.cls}`}>{status.label}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <form action={updateActualAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="id" value={c.id} />
                          <input
                            type="number"
                            name="actual"
                            defaultValue={c.actual ?? ""}
                            min={0}
                            step={1000}
                            placeholder="実績を入力"
                            className="w-32 rounded border border-gray-200 px-2 py-1 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-400"
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
                        <Link
                          href={`/ec/campaigns/${c.id}/edit`}
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
        </div>
      ) : (
        /* ── 月別グループビュー ── */
        <div className="space-y-5">
          {months.map(([ym, campaigns]) => {
            const mTarget  = campaigns.reduce((s, c) => s + c.target, 0);
            const mDone    = campaigns.filter((c) => c.actual !== undefined);
            const mActual  = mDone.reduce((s, c) => s + (c.actual ?? 0), 0);
            const mPct     = mTarget > 0 && mDone.length > 0
              ? calcPct(mActual, mTarget) : null;

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
                        {formatCurrency(mTarget)}
                      </span>
                    </span>
                    {mDone.length > 0 && (
                      <span>
                        実績{" "}
                        <span className="font-medium text-gray-700 tabular-nums">
                          {formatCurrency(mActual)}
                        </span>
                      </span>
                    )}
                    {mPct !== null && (
                      <span className={`inline-flex items-center rounded px-2 py-0.5 font-semibold ${achieveBadgeClass(mPct)}`}>
                        {mPct}%
                      </span>
                    )}
                  </div>
                </div>

                {/* 企画テーブル */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-left">
                        <th className="px-4 py-2 font-medium text-gray-400">種別</th>
                        <th className="px-4 py-2 font-medium text-gray-400">企画名</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-400">売上目標</th>
                        <th className="px-4 py-2 text-center font-medium text-gray-400">達成率</th>
                        <th className="px-4 py-2 font-medium text-gray-400">実績入力</th>
                        <th className="px-4 py-2 font-medium text-gray-400">状態</th>
                        <th className="px-4 py-2 font-medium text-gray-400"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {campaigns.map((c) => {
                        const status = getStatus(c.targetMonth, c.actual);
                        const diff   = c.actual !== undefined ? c.actual - c.target : null;
                        const pct    = c.actual !== undefined ? calcPct(c.actual, c.target) : null;

                        const rowBg = c.actual !== undefined
                          ? pct !== null && pct < 50 ? "bg-red-50"
                          : pct !== null && pct < 80 ? "bg-yellow-50"
                          : "bg-green-50/40"
                          : "bg-white";

                        return (
                          <tr
                            key={c.id}
                            className={`${rowBg} hover:bg-gray-50`}
                          >
                            <td className="px-4 py-2.5">
                              <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${EC_CAMPAIGN_TYPE_STYLES[c.type]}`}>
                                {c.type}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-medium text-gray-800">
                              {c.name}
                              {c.memo && (
                                <span className="ml-2 text-xs font-normal text-gray-400">{c.memo}</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-700">
                              {formatCurrency(c.target)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {pct !== null ? (
                                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${achieveBadgeClass(pct)}`}>
                                  {pct}%
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              <form action={updateActualAction} className="flex items-center gap-1.5">
                                <input type="hidden" name="id" value={c.id} />
                                <input
                                  type="number"
                                  name="actual"
                                  defaultValue={c.actual ?? ""}
                                  min={0}
                                  step={1000}
                                  placeholder="実績を入力"
                                  className="w-32 rounded border border-gray-200 px-2 py-1 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-400"
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
                                href={`/ec/campaigns/${c.id}/edit`}
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
      {filtered.length > 0 && (
        <div className="rounded border border-gray-200 bg-gray-50 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500">目標合計</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">
                {formatCurrency(totalTarget)}
              </p>
            </div>
            {completedCount > 0 && (
              <div>
                <p className="text-xs text-gray-500">
                  実績合計（{completedCount}/{filtered.length}件入力済み）
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
                <span className={`inline-flex items-center rounded px-3 py-1 font-bold ${achieveBadgeClass(achievePct)}`}>
                  達成率 {achievePct}%
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
