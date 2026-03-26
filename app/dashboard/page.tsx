import Link from "next/link";
import { getAllGoods } from "@/lib/store";
import { calcGoods } from "@/lib/calculations";
import {
  calcSummary,
  groupByCategory,
  getCategoryAnalysis,
  getMonthlyAnalysis,
  getChannelAnalysis,
  getStockAlerts,
  getRankingByRevenue,
  getRankingByGrossProfit,
  getRankingByStock,
} from "@/lib/aggregations";
import { formatCurrency, formatMargin, formatNumber } from "@/lib/format";
import { getAnnualTargetSummary } from "@/lib/targetStore";
import { getAllCampaigns } from "@/lib/ecCampaignStore";
import { getAllEvents } from "@/lib/eventStore";
import { getAllHistory } from "@/lib/historyStore";
import { buildAlerts } from "@/lib/alertEngine";
import KpiCard from "@/components/KpiCard";
import RankingList from "@/components/RankingList";
import CategoryAnalysisTable from "@/components/CategoryAnalysisTable";
import MonthlyAnalysisTable from "@/components/MonthlyAnalysisTable";
import ChannelAnalysisTable from "@/components/ChannelAnalysisTable";
import StatusBadge from "@/components/StatusBadge";
import type { GoodsStatus } from "@/types/goods";
import type { AlertLevel, AlertCategory } from "@/types/alert";

type RankTab = "revenue" | "grossProfit" | "stock";

const ALERT_STYLES = {
  切れ:   { badge: "bg-red-100 text-red-700",      label: "在庫切れ"    },
  少:     { badge: "bg-yellow-100 text-yellow-700", label: "在庫少"      },
  未設定: { badge: "bg-gray-100 text-gray-600",     label: "製作数未設定" },
};

const APP_ALERT_BADGE: Record<AlertLevel, string> = {
  critical:    "bg-red-100 text-red-700",
  warn:        "bg-yellow-100 text-yellow-700",
  info:        "bg-blue-100 text-blue-700",
  opportunity: "bg-purple-100 text-purple-700",
};
const APP_ALERT_LABEL: Record<AlertLevel, string> = {
  critical:    "要改善",
  warn:        "注意",
  info:        "入力待ち",
  opportunity: "機会損失候補",
};
const APP_ALERT_CAT_LABEL: Record<AlertCategory, string> = {
  ec:         "EC",
  event:      "大会・イベント",
  goods:      "商品",
  suggestion: "AI提案",
};

interface Props {
  searchParams: Promise<{ rank?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const { rank } = await searchParams;
  const activeTab: RankTab =
    rank === "grossProfit" ? "grossProfit" :
    rank === "stock"       ? "stock"       : "revenue";

  const goods            = getAllGoods().map(calcGoods);
  const summary          = calcSummary(goods);
  const byCategory       = groupByCategory(goods);
  const categoryAnalysis = getCategoryAnalysis(goods);
  const monthlyAnalysis  = getMonthlyAnalysis(goods);
  const channelAnalysis  = getChannelAnalysis(goods);
  const alerts           = getStockAlerts(goods);
  const annualTarget     = getAnnualTargetSummary(2026);

  // 未達アラート（全カテゴリ横断）
  const appAlerts = buildAlerts({
    campaigns: getAllCampaigns(),
    events:    getAllEvents(),
    goodsList: goods,
    histories: getAllHistory(),
  });
  const criticalCount    = appAlerts.filter((a) => a.level === "critical").length;
  const warnCount        = appAlerts.filter((a) => a.level === "warn").length;
  const infoCount        = appAlerts.filter((a) => a.level === "info").length;
  const opportunityCount = appAlerts.filter((a) => a.level === "opportunity").length;
  const alertCategories: AlertCategory[] = ["ec", "event", "goods", "suggestion"];

  // 実績：チャネル別（FC限定 は EC内 ecFc 区分に対応）
  const venueActual = channelAnalysis.find((c) => c.channel === "会場")?.revenue    ?? 0;
  const ecActual    = channelAnalysis.find((c) => c.channel === "EC")?.revenue      ?? 0;
  const fcActual    = channelAnalysis.find((c) => c.channel === "FC限定")?.revenue  ?? 0;
  const ecWithFc    = ecActual + fcActual;  // EC + FC連動 を合算して EC目標と比較

  const venuePct = annualTarget.venueTotal > 0
    ? Math.round(venueActual / annualTarget.venueTotal * 100) : 0;
  const ecPct    = annualTarget.ecTotal > 0
    ? Math.round(ecWithFc   / annualTarget.ecTotal    * 100) : 0;
  const totalPct = annualTarget.grandTotal > 0
    ? Math.round((venueActual + ecWithFc) / annualTarget.grandTotal * 100) : 0;

  const rankingItems =
    activeTab === "grossProfit" ? getRankingByGrossProfit(goods) :
    activeTab === "stock"       ? getRankingByStock(goods)       :
                                  getRankingByRevenue(goods);

  const rankConfig = {
    revenue:     { primary: formatCurrency, secondary: formatCurrency, secondaryLabel: "粗利" },
    grossProfit: { primary: formatCurrency, secondary: (v: number) => formatMargin(v), secondaryLabel: "粗利率" },
    stock:       { primary: (v: number) => `${formatNumber(v)}個`, secondary: formatCurrency, secondaryLabel: "在庫金額" },
  }[activeTab];

  const marginColor = summary.grossMargin >= 0.3 ? "text-green-700"
                    : summary.grossMargin >= 0    ? "text-yellow-600"
                    :                               "text-red-600";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">ダッシュボード</h1>

      {/* KPI カード */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiCard
          label="総売上"
          value={formatCurrency(summary.revenue)}
        />
        <KpiCard
          label="総粗利"
          value={formatCurrency(summary.grossProfit)}
          valueColor={summary.grossProfit >= 0 ? "text-green-700" : "text-red-600"}
        />
        <KpiCard
          label="粗利率"
          value={formatMargin(summary.grossMargin)}
          valueColor={marginColor}
          sub={`${summary.count}商品`}
        />
        <KpiCard
          label="在庫金額"
          value={formatCurrency(summary.inventoryValue)}
          sub="売れ残り原価合計"
        />
        <KpiCard
          label="在庫率"
          value={formatMargin(summary.inventoryRate)}
          valueColor={summary.inventoryRate >= 0.5 ? "text-red-600" : "text-gray-900"}
          sub="在庫数 / 製作数"
        />
      </div>

      {/* 売上目標 */}
      <section className="rounded border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">売上目標（2026年・年間）</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              ※ 実績は登録済み全商品の累積値です
            </p>
          </div>
          <Link
            href="/dashboard/targets"
            className="shrink-0 text-xs text-blue-500 hover:underline"
          >
            目標を設定する →
          </Link>
        </div>

        <div className="divide-y divide-gray-100">
          {/* 現場 */}
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold text-gray-600">現場</span>
              <span className="text-xs text-gray-400 tabular-nums">
                {formatCurrency(venueActual)} / {formatCurrency(annualTarget.venueTotal)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  venuePct >= 100 ? "bg-green-500" :
                  venuePct >= 70  ? "bg-blue-500"  :
                  venuePct >= 40  ? "bg-yellow-400" : "bg-gray-300"
                }`}
                style={{ width: `${Math.min(100, venuePct)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-xs text-gray-400">
                <span>主催大会 {formatCurrency(annualTarget.venueHosted)}</span>
                <span>イベント {formatCurrency(annualTarget.venueEvent)}</span>
              </div>
              <span className={`text-sm font-bold tabular-nums ${
                venuePct >= 100 ? "text-green-600" :
                venuePct >= 70  ? "text-blue-600"  : "text-gray-700"
              }`}>
                {venuePct}%
              </span>
            </div>
          </div>

          {/* EC */}
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold text-gray-600">EC・FC</span>
              <span className="text-xs text-gray-400 tabular-nums">
                {formatCurrency(ecWithFc)} / {formatCurrency(annualTarget.ecTotal)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  ecPct >= 100 ? "bg-green-500" :
                  ecPct >= 70  ? "bg-blue-500"  :
                  ecPct >= 40  ? "bg-yellow-400" : "bg-gray-300"
                }`}
                style={{ width: `${Math.min(100, ecPct)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                <span>通常販売 {formatCurrency(annualTarget.ecRegular)}</span>
                <span>季節企画 {formatCurrency(annualTarget.ecSeasonal)}</span>
                <span>受注企画 {formatCurrency(annualTarget.ecPreorder)}</span>
                <span>FC連動 {formatCurrency(annualTarget.ecFc)}</span>
                {annualTarget.ecAnniversary > 0 && (
                  <span>周年企画 {formatCurrency(annualTarget.ecAnniversary)}</span>
                )}
              </div>
              <span className={`shrink-0 text-sm font-bold tabular-nums ${
                ecPct >= 100 ? "text-green-600" :
                ecPct >= 70  ? "text-blue-600"  : "text-gray-700"
              }`}>
                {ecPct}%
              </span>
            </div>
          </div>

          {/* 合計 */}
          <div className="flex items-center justify-between bg-gray-50 px-5 py-3">
            <span className="text-xs text-gray-500">
              年間合計目標 {formatCurrency(annualTarget.grandTotal)}
            </span>
            <span className={`text-base font-bold tabular-nums ${
              totalPct >= 100 ? "text-green-600" :
              totalPct >= 70  ? "text-blue-600"  : "text-gray-700"
            }`}>
              合計 {totalPct}%
            </span>
          </div>
        </div>
      </section>

      {/* 未達アラート */}
      {appAlerts.length > 0 && (
        <section className="rounded border border-gray-200 bg-white">
          {/* パネルヘッダー */}
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700">未達アラート</h2>
            {criticalCount > 0 && (
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                要改善 {criticalCount}件
              </span>
            )}
            {warnCount > 0 && (
              <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                注意 {warnCount}件
              </span>
            )}
            {infoCount > 0 && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                入力待ち {infoCount}件
              </span>
            )}
            {opportunityCount > 0 && (
              <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                機会損失候補 {opportunityCount}件
              </span>
            )}
          </div>

          {/* カテゴリ別グループ */}
          <div className="divide-y divide-gray-100">
            {alertCategories.map((cat) => {
              const catAlerts = appAlerts.filter((a) => a.category === cat);
              if (catAlerts.length === 0) return null;
              return (
                <div key={cat} className="px-4 py-3">
                  <p className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {APP_ALERT_CAT_LABEL[cat]}
                  </p>
                  <div className="space-y-1.5">
                    {catAlerts.map((alert) => (
                      <Link
                        key={alert.id}
                        href={alert.href}
                        className="flex items-center gap-2 text-xs hover:opacity-75"
                      >
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 font-medium ${APP_ALERT_BADGE[alert.level]}`}
                        >
                          {APP_ALERT_LABEL[alert.level]}
                        </span>
                        <span className="text-gray-700">{alert.message}</span>
                        <span className="ml-auto shrink-0 text-gray-300">→</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 在庫警告 */}
      {alerts.length > 0 && (
        <section className="rounded border border-red-200 bg-red-50 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700">
            在庫警告
            <span className="rounded bg-red-600 px-1.5 py-0.5 text-xs text-white">
              {alerts.length}件
            </span>
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {alerts.map((a) => {
              const style = ALERT_STYLES[a.level];
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded border border-red-100 bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/goods/${a.id}`}
                      className="block truncate text-sm font-medium text-blue-600 hover:underline"
                    >
                      {a.name}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2">
                      <StatusBadge status={a.status as GoodsStatus} />
                      <span className="text-xs text-gray-500">
                        在庫 {formatNumber(a.stockCount)}個
                      </span>
                    </div>
                  </div>
                  <span className={`ml-3 shrink-0 rounded px-2 py-0.5 text-xs font-medium ${style.badge}`}>
                    {style.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2カラム: ランキング + カテゴリ別粗利 */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* 商品別ランキング */}
        <section className="rounded border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 pt-3">
            <h2 className="text-sm font-semibold text-gray-700">商品別ランキング</h2>
          </div>
          <RankingList
            items={rankingItems}
            activeTab={activeTab}
            formatPrimary={rankConfig.primary}
            formatSecondary={rankConfig.secondary}
            secondaryLabel={rankConfig.secondaryLabel}
          />
        </section>

        {/* カテゴリ別粗利 */}
        <section className="rounded border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700">カテゴリ別粗利</h2>
          </div>
          {byCategory.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">データがありません。</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-2 text-left font-medium">カテゴリ</th>
                  <th className="px-4 py-2 text-right font-medium">商品数</th>
                  <th className="px-4 py-2 text-right font-medium">粗利</th>
                  <th className="px-4 py-2 text-right font-medium">粗利率</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byCategory.map((row) => {
                  const color =
                    row.grossMargin >= 0.3 ? "text-green-700" :
                    row.grossMargin >= 0   ? "text-yellow-600" : "text-red-600";
                  return (
                    <tr key={row.key} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{row.key}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">
                        {row.count}
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${
                        row.grossProfit >= 0 ? "text-green-700" : "text-red-600"
                      }`}>
                        {formatCurrency(row.grossProfit)}
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${color}`}>
                        {formatMargin(row.grossMargin)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {/* カテゴリ別分析 */}
      <section className="rounded border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">カテゴリ別分析</h2>
        </div>
        <CategoryAnalysisTable rows={categoryAnalysis} />
      </section>

      {/* 月別分析 */}
      <section className="rounded border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">月別分析</h2>
          <p className="mt-0.5 text-xs text-gray-400">発売月ベースで集計しています</p>
        </div>
        <MonthlyAnalysisTable rows={monthlyAnalysis} />
      </section>

      {/* チャネル別分析 */}
      <section className="rounded border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">チャネル別分析</h2>
        </div>
        <ChannelAnalysisTable rows={channelAnalysis} />
      </section>
    </div>
  );
}
