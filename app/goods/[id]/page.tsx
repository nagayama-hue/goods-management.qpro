import { notFound } from "next/navigation";
import Link from "next/link";
import { getGoodsById, getAllGoods } from "@/lib/store";
import { calcGoods } from "@/lib/calculations";
import { evaluateGoods, THRESHOLDS } from "@/lib/evaluation";
import { scoreGoods } from "@/lib/scoring";
import { parseAiMemo } from "@/lib/parseAiMemo";
import { formatCurrency, formatMargin, formatNumber } from "@/lib/format";
import { getRecommendedLink, getCandidateLinks } from "@/lib/goodsSupplierStore";
import { getSupplierById, getAllSuppliers } from "@/lib/supplierStore";
import { getOrderHistoryForGoods } from "@/lib/orderHistoryStore";
import {
  getAirregiStockByCode,
  getAirregiSalesByCode,
  getAirregiProductByCode,
} from "@/lib/airregiStore";
import type { AirregiSyncStatus } from "@/types/airregi";
import StatusBadge from "@/components/StatusBadge";
import EvaluationBadge from "@/components/EvaluationBadge";
import PriorityBadge from "@/components/PriorityBadge";
import PrioritySelector from "@/components/PrioritySelector";
import ScoreBadge from "@/components/ScoreBadge";
import DerivativeSuggestionSection from "@/components/DerivativeSuggestionSection";
import {
  addOrderHistoryAction,
} from "./supplier-actions";
import { PRIORITY_LABEL_STYLE } from "@/types/goodsSupplier";
import {
  PRICE_SENSE_STYLE,
  DELIVERY_SPEED_STYLE,
  QUALITY_STYLE,
} from "@/types/supplier";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function GoodsDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { saved } = await searchParams;
  const goods = getGoodsById(id);
  if (!goods) notFound();

  const allGoods       = getAllGoods().map(calcGoods);
  const g              = calcGoods(goods);
  const evaluation     = evaluateGoods(g);
  const score          = scoreGoods(g, allGoods);
  const aiMemo         = parseAiMemo(g.memo);

  // 取引先紐付けデータ
  const recommendedLink   = getRecommendedLink(g.id);
  const recommendedSup    = recommendedLink ? getSupplierById(recommendedLink.supplierId) : undefined;
  const candidateLinks    = getCandidateLinks(g.id);
  const orderHistory      = getOrderHistoryForGoods(g.id);
  const allSuppliers      = getAllSuppliers();
  const supplierMap       = Object.fromEntries(allSuppliers.map((s) => [s.id, s]));

  // Airレジ連携データ
  const airCode           = g.airregiProductCode;
  const airProduct        = airCode ? getAirregiProductByCode(airCode) : undefined;
  const airStock          = airCode ? getAirregiStockByCode(airCode)   : undefined;
  const airSales          = airCode ? getAirregiSalesByCode(airCode)   : undefined;
  const airSyncStatus: AirregiSyncStatus =
    !airCode                      ? "unlinked" :
    airStock || airSales || airProduct ? "linked" : "missing";

  const savedMessage =
    saved === "created" ? "商品を登録しました。" :
    saved === "updated" ? "変更を保存しました。" : null;

  return (
    <div className="space-y-6">
      {/* 保存成功バナー */}
      {savedMessage && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ {savedMessage}
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
            ← 一覧に戻る
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">{g.name}</h1>
        </div>
        <Link
          href={`/goods/${g.id}/edit`}
          className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          編集
        </Link>
      </div>

      {/* 数値サマリー */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "予定販売価格",  value: formatCurrency(g.sales.sellingPrice), color: "text-gray-900" },
          { label: "想定売上",      value: formatCurrency(g.revenue),            color: "text-gray-900" },
          { label: "想定粗利",      value: formatCurrency(g.grossProfit),        color: g.grossProfit >= 0 ? "text-green-700" : "text-red-600" },
          { label: "想定粗利率",    value: formatMargin(g.grossMargin),          color: g.grossMargin >= 0.3 ? "text-green-700" : "text-yellow-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`mt-1 text-xl font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* 基本情報 */}
      <section className="rounded border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">基本情報</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-gray-500">ステータス</dt>
            <dd className="mt-1"><StatusBadge status={g.status} /></dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">カテゴリ</dt>
            <dd className="mt-1 text-gray-800">{g.category}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">企画優先度</dt>
            <dd className="mt-1"><PriorityBadge priority={g.priority} /></dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">販売チャネル</dt>
            <dd className="mt-1 text-gray-800">{g.salesChannel}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">ターゲット</dt>
            <dd className="mt-1 text-gray-800">{g.target || "—"}</dd>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-xs text-gray-500">コンセプト</dt>
            <dd className="mt-1 text-gray-800">{g.concept || "—"}</dd>
          </div>
          {g.memo && (
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-xs text-gray-500">メモ</dt>
              <dd className="mt-1 text-gray-800">{g.memo}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* 販売計画 */}
      <section className="rounded border border-gray-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">販売計画</h2>
        <p className="mb-4 text-xs text-gray-400">
          {g.variants && g.variants.length > 0
            ? "バリエーション集計値です。内訳は下の表を参照してください。"
            : "計画値です。実績はAirレジ連携後に参照できます。"}
        </p>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs text-gray-500">予定製作数</dt>
            <dd className="mt-1 text-gray-800">{formatNumber(g.sales.productionCount)} 個</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">販売目標数</dt>
            <dd className="mt-1 text-gray-800">{formatNumber(g.sales.salesCount)} 個</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">在庫予測</dt>
            <dd className="mt-1 text-gray-800">{formatNumber(g.stockCount)} 個</dd>
          </div>
        </dl>
      </section>

      {/* バリエーション内訳 */}
      {g.variants && g.variants.length > 0 && (
        <section className="rounded border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">バリエーション内訳</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500">
                  <th className="pb-2 pr-4 text-left font-medium">カラー</th>
                  <th className="pb-2 pr-4 text-left font-medium">サイズ</th>
                  <th className="pb-2 pr-4 text-right font-medium">予定製作数</th>
                  <th className="pb-2 pr-4 text-right font-medium">在庫数</th>
                  <th className="pb-2 text-right font-medium">販売数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {g.variants.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2 pr-4 text-gray-700">{v.color || "—"}</td>
                    <td className="py-2 pr-4 text-gray-700">{v.size || "—"}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-gray-700">{formatNumber(v.plannedQuantity)} 個</td>
                    <td className={`py-2 pr-4 text-right tabular-nums font-medium ${v.stockQuantity === 0 ? "text-red-600" : v.stockQuantity <= 5 ? "text-orange-600" : "text-gray-700"}`}>
                      {formatNumber(v.stockQuantity)} 個
                    </td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{formatNumber(v.soldQuantity)} 個</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t text-xs font-semibold text-gray-700">
                  <td className="pt-2 pr-4" colSpan={2}>合計</td>
                  <td className="pt-2 pr-4 text-right tabular-nums">
                    {formatNumber(g.variants.reduce((s, v) => s + v.plannedQuantity, 0))} 個
                  </td>
                  <td className="pt-2 pr-4 text-right tabular-nums">
                    {formatNumber(g.variants.reduce((s, v) => s + v.stockQuantity, 0))} 個
                  </td>
                  <td className="pt-2 text-right tabular-nums">
                    {formatNumber(g.variants.reduce((s, v) => s + v.soldQuantity, 0))} 個
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* 予算・コスト内訳 */}
      <section className="rounded border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">予算・コスト内訳</h2>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            <tr className="bg-gray-50">
              <td className="py-2 font-medium text-gray-700">予算額</td>
              <td className="py-2 text-right font-medium text-gray-700">
                {formatCurrency(g.budget.budgetAmount)}
              </td>
            </tr>
            {[
              ["デザイン費",  g.budget.designCost],
              ["サンプル費",  g.budget.sampleCost],
              ["製造原価",    g.budget.manufacturingCost],
              ["送料",        g.budget.shippingCost],
              ["その他経費",  g.budget.otherCost],
            ].map(([label, value]) => (
              <tr key={label as string}>
                <td className="py-2 text-gray-600">{label}</td>
                <td className="py-2 text-right text-gray-800">
                  {formatCurrency(value as number)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td className="py-2 font-semibold text-gray-900">合計コスト</td>
              <td className="py-2 text-right font-semibold text-gray-900">
                {formatCurrency(g.totalCost)}
              </td>
            </tr>
            {g.budget.budgetAmount > 0 && (
              <tr>
                <td className="py-1 text-xs text-gray-500">予算との差額</td>
                <td className={`py-1 text-right text-xs font-medium ${
                  g.budget.budgetAmount - g.totalCost >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {formatCurrency(g.budget.budgetAmount - g.totalCost)}
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </section>

      {/* 企画優先度 */}
      <section className="rounded border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">企画優先度</h2>
        <p className="mb-3 text-xs text-gray-500">
          制作工程のステータスとは別に、「いつ作るか」の判断を設定します。
        </p>
        <PrioritySelector goodsId={g.id} current={g.priority} />
      </section>

      {/* 商品評価 */}
      <section className="rounded border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">商品評価</h2>
        <div className="flex items-center gap-3">
          <EvaluationBadge level={evaluation.level} />
          {evaluation.reasons.length === 0 && (
            <span className="text-sm text-gray-500">問題は検出されていません。</span>
          )}
        </div>

        {evaluation.reasons.length > 0 && (
          <ul className="mt-4 space-y-2">
            {evaluation.reasons.map((reason) => {
              const detail =
                reason === "在庫過多"
                  ? `在庫率 ${formatMargin(g.stockCount / g.sales.productionCount)}（しきい値 ${formatMargin(THRESHOLDS.inventoryRate)} 以上）`
                  : reason === "低粗利"
                  ? `粗利率 ${formatMargin(g.grossMargin)}（しきい値 ${formatMargin(THRESHOLDS.grossMargin)} 以下）`
                  : `販売数 ${formatNumber(g.sales.salesCount)}個（しきい値 ${THRESHOLDS.salesCount}個 以下）`;
              return (
                <li key={reason} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-yellow-500">⚠</span>
                  <div>
                    <span className="font-medium text-gray-800">{reason}</span>
                    <span className="ml-2 text-gray-500">{detail}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 売れる確率スコア */}
      <section className="rounded border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">売れる確率スコア</h2>
        <div className="flex items-center gap-3">
          <ScoreBadge score={score.score} level={score.level} size="md" />
          <span className="text-sm text-gray-500">
            {score.level === "高い" ? "販売実績・収益性ともに良好です。" :
             score.level === "中"   ? "一部の課題を改善することでスコアが向上します。" :
                                      "複数の改善点があります。"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 加点要因 */}
          {score.plusReasons.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-green-700">加点要因</p>
              <ul className="space-y-1">
                {score.plusReasons.map((r) => (
                  <li key={r} className="flex items-start gap-1.5 text-sm text-gray-700">
                    <span className="mt-0.5 shrink-0 text-green-500">＋</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* 減点要因 */}
          {score.minusReasons.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-red-600">減点要因</p>
              <ul className="space-y-1">
                {score.minusReasons.map((r) => (
                  <li key={r} className="flex items-start gap-1.5 text-sm text-gray-700">
                    <span className="mt-0.5 shrink-0 text-red-400">－</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {score.plusReasons.length === 0 && score.minusReasons.length === 0 && (
            <p className="text-sm text-gray-400">まだ販売データがありません。</p>
          )}
        </div>
      </section>

      {/* ───────────────────────────────────────────── */}
      {/* 取引先・発注管理 */}
      {/* ───────────────────────────────────────────── */}

      {/* A. 推奨取引先 */}
      <section className="rounded border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-gray-700">推奨取引先</h2>
          <Link
            href={`/goods/${g.id}/edit#supplier`}
            className="text-xs text-blue-600 hover:underline"
          >
            変更
          </Link>
        </div>

        {recommendedSup ? (
          <div className="space-y-3">
            {/* 取引先カード */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link
                  href={`/suppliers/${recommendedSup.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {recommendedSup.name}
                </Link>
                {recommendedSup.contactName && (
                  <p className="mt-0.5 text-xs text-gray-400">{recommendedSup.contactName}</p>
                )}
              </div>
              <span className="shrink-0 text-yellow-500 text-xs tracking-tight">
                {"★".repeat(recommendedSup.rating)}{"☆".repeat(5 - recommendedSup.rating)}
              </span>
            </div>

            {/* 属性バッジ群 */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={`rounded px-2 py-0.5 font-medium ${PRICE_SENSE_STYLE[recommendedSup.priceSense]}`}>
                {recommendedSup.priceSense}
              </span>
              <span className={`rounded px-2 py-0.5 font-medium ${DELIVERY_SPEED_STYLE[recommendedSup.deliverySpeed]}`}>
                納期{recommendedSup.deliverySpeed}
                {recommendedSup.deliveryDays !== undefined && `（${recommendedSup.deliveryDays}日）`}
              </span>
              <span className={`rounded px-2 py-0.5 font-medium ${QUALITY_STYLE[recommendedSup.quality]}`}>
                品質{recommendedSup.quality}
              </span>
              {recommendedSup.minLot !== undefined && (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">
                  {recommendedSup.minLot.toLocaleString()}個〜
                </span>
              )}
              {recommendedSup.genres.slice(0, 3).map((g2) => (
                <span key={g2} className="rounded bg-gray-100 px-2 py-0.5 text-gray-500">
                  {g2}
                </span>
              ))}
            </div>

            {/* 選定メモ */}
            {recommendedLink?.note && (
              <div className="rounded bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-400 mb-0.5">選定メモ</p>
                <p className="whitespace-pre-wrap text-sm text-gray-700">{recommendedLink.note}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            推奨取引先が設定されていません。
            <Link href={`/goods/${g.id}/edit#supplier`} className="ml-1 text-blue-600 hover:underline">
              設定する →
            </Link>
          </p>
        )}
      </section>

      {/* B. 候補取引先一覧 */}
      {candidateLinks.length > 0 && (
        <section className="rounded border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">候補取引先</h2>
          <div className="space-y-3">
            {candidateLinks.map((link) => {
              const sup = supplierMap[link.supplierId];
              if (!sup) return null;
              return (
                <div
                  key={link.id}
                  className="flex items-start gap-3 rounded border border-gray-100 p-3"
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                      PRIORITY_LABEL_STYLE[link.priorityLabel ?? "比較用"]
                    }`}
                  >
                    {link.priorityLabel ?? "比較用"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/suppliers/${sup.id}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        {sup.name}
                      </Link>
                      <span className="text-xs text-yellow-500 tracking-tight">
                        {"★".repeat(sup.rating)}{"☆".repeat(5 - sup.rating)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 text-xs">
                      <span className={`rounded px-1.5 py-0.5 ${PRICE_SENSE_STYLE[sup.priceSense]}`}>{sup.priceSense}</span>
                      <span className={`rounded px-1.5 py-0.5 ${DELIVERY_SPEED_STYLE[sup.deliverySpeed]}`}>
                        納期{sup.deliverySpeed}
                        {sup.deliveryDays !== undefined && `（${sup.deliveryDays}日）`}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 ${QUALITY_STYLE[sup.quality]}`}>品質{sup.quality}</span>
                    </div>
                    {link.note && (
                      <p className="mt-1 text-xs text-gray-500">{link.note}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* C. 発注履歴 */}
      <section className="rounded border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">発注履歴</h2>

        {orderHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs">
                  <th className="px-3 py-2 font-medium text-gray-500">発注日</th>
                  <th className="px-3 py-2 font-medium text-gray-500">取引先</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">数量</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">単価</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">合計</th>
                  <th className="px-3 py-2 font-medium text-gray-500">納品日</th>
                  <th className="px-3 py-2 font-medium text-gray-500">メモ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orderHistory.map((h) => {
                  const sup = supplierMap[h.supplierId];
                  return (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700">{h.orderDate}</td>
                      <td className="px-3 py-2">
                        {sup ? (
                          <Link
                            href={`/suppliers/${sup.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {sup.name}
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                        {h.quantity.toLocaleString()}個
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                        {formatCurrency(h.unitCost)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-800">
                        {formatCurrency(h.totalCost)}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{h.deliveryDate ?? "—"}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{h.memo ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">発注履歴はまだありません。</p>
        )}

        {/* 発注履歴を追加するフォーム */}
        {allSuppliers.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-blue-600 hover:underline select-none">
              ＋ 発注記録を追加
            </summary>
            <form action={addOrderHistoryAction} className="mt-3 space-y-3 rounded border border-gray-200 p-4">
              <input type="hidden" name="goodsId" value={g.id} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    取引先 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="supplierId"
                    required
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {allSuppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    発注日 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="orderDate"
                    required
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    数量（個）<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    min={1}
                    step={1}
                    placeholder="例：100"
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    単価（円）<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="unitCost"
                    required
                    min={0}
                    step={1}
                    placeholder="例：500"
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">納品日（任意）</label>
                  <input
                    type="date"
                    name="deliveryDate"
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">メモ（任意）</label>
                  <input
                    type="text"
                    name="memo"
                    placeholder="品質・納期のフィードバックなど"
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="rounded bg-gray-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-gray-600"
              >
                追加する
              </button>
            </form>
          </details>
        )}
      </section>

      {/* AI提案由来の場合は提案情報を表示 */}
      {aiMemo && (
        <section className="rounded border border-purple-200 bg-purple-50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">AI</span>
            <h2 className="text-sm font-semibold text-purple-900">AI提案情報</h2>
          </div>
          <dl className="space-y-3 text-sm">
            {aiMemo.reason && (
              <div>
                <dt className="text-xs font-medium text-purple-700">企画理由</dt>
                <dd className="mt-0.5 text-gray-800">{aiMemo.reason}</dd>
              </div>
            )}
            {aiMemo.insight && (
              <div>
                <dt className="text-xs font-medium text-purple-700">根拠・データとの関連</dt>
                <dd className="mt-0.5 text-gray-700">{aiMemo.insight}</dd>
              </div>
            )}
            {aiMemo.risk && (
              <div>
                <dt className="text-xs font-medium text-purple-700">想定リスク</dt>
                <dd className="mt-0.5 text-yellow-700">⚠ {aiMemo.risk}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Airレジ実績 */}
      <section className="rounded border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Airレジ実績</h2>
          {airSyncStatus === "linked"   && <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">連携済み</span>}
          {airSyncStatus === "missing"  && <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">コード未一致</span>}
          {airSyncStatus === "unlinked" && <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">商品コード未設定</span>}
        </div>

        {airSyncStatus === "unlinked" ? (
          <p className="text-sm text-gray-400">
            商品コードが設定されていません。
            <Link href={`/goods/${g.id}/edit`} className="ml-1 text-blue-500 hover:underline">
              編集画面で設定する →
            </Link>
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-gray-400">商品コード</dt>
              <dd className="mt-0.5 font-mono text-sm text-gray-800">{airCode}</dd>
            </div>
            {airProduct && (
              <div>
                <dt className="text-xs text-gray-400">Airレジ商品名</dt>
                <dd className="mt-0.5 text-gray-800">{airProduct.productName}</dd>
              </div>
            )}
            {airProduct?.category && (
              <div>
                <dt className="text-xs text-gray-400">Airレジカテゴリ</dt>
                <dd className="mt-0.5 text-gray-800">{airProduct.category}</dd>
              </div>
            )}
            {airStock ? (
              <div>
                <dt className="text-xs text-gray-400">Airレジ在庫数</dt>
                <dd className={`mt-0.5 font-semibold ${airStock.currentStock <= 0 ? "text-red-600" : airStock.currentStock <= 10 ? "text-yellow-600" : "text-gray-800"}`}>
                  {airStock.currentStock.toLocaleString()}個
                  {airStock.currentStock <= 0  && <span className="ml-1 text-xs">(在庫なし)</span>}
                  {airStock.currentStock > 0 && airStock.currentStock <= 10 && <span className="ml-1 text-xs">(在庫少)</span>}
                </dd>
              </div>
            ) : (
              <div>
                <dt className="text-xs text-gray-400">Airレジ在庫数</dt>
                <dd className="mt-0.5 text-gray-400">取込なし</dd>
              </div>
            )}
            {airSales ? (
              <>
                <div>
                  <dt className="text-xs text-gray-400">販売数（Airレジ）</dt>
                  <dd className="mt-0.5 font-semibold text-gray-800">{airSales.salesQuantity.toLocaleString()}個</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">売上金額（Airレジ）</dt>
                  <dd className="mt-0.5 font-semibold text-gray-800">{formatCurrency(airSales.salesAmount)}</dd>
                </div>
                {airSales.targetPeriodStart && (
                  <div>
                    <dt className="text-xs text-gray-400">集計期間</dt>
                    <dd className="mt-0.5 text-gray-600 text-xs">
                      {airSales.targetPeriodStart}
                      {airSales.targetPeriodEnd && ` 〜 ${airSales.targetPeriodEnd}`}
                    </dd>
                  </div>
                )}
              </>
            ) : (
              <div>
                <dt className="text-xs text-gray-400">売上（Airレジ）</dt>
                <dd className="mt-0.5 text-gray-400">取込なし</dd>
              </div>
            )}
            {(airStock || airSales || airProduct) && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-xs text-gray-400">最終取込日時</dt>
                <dd className="mt-0.5 text-xs text-gray-500">
                  {(airStock?.importedAt ?? airSales?.importedAt ?? airProduct?.importedAt)
                    ? new Date(airStock?.importedAt ?? airSales?.importedAt ?? airProduct!.importedAt).toLocaleString("ja-JP")
                    : "—"}
                </dd>
              </div>
            )}
          </dl>
        )}

        {airSyncStatus === "missing" && (
          <p className="mt-3 text-xs text-orange-600">
            商品コード「{airCode}」がAirレジのデータに見つかりません。
            コードが正しいか確認するか、先に在庫・売上CSVを取り込んでください。
            <Link href="/airregi" className="ml-1 underline hover:opacity-75">
              Airレジ連携 →
            </Link>
          </p>
        )}
      </section>

      {/* 計画 vs 実績 比較（Airレジ連携済みの場合のみ） */}
      {airSyncStatus === "linked" && (airStock || airSales) && (
        <section className="rounded border border-blue-100 bg-blue-50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-blue-800">計画 vs 実績</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-200 text-xs text-blue-700">
                  <th className="pb-2 text-left font-medium">指標</th>
                  <th className="pb-2 text-right font-medium">計画値</th>
                  <th className="pb-2 text-right font-medium">実績（Airレジ）</th>
                  <th className="pb-2 text-right font-medium">達成率</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {airStock && (
                  <tr>
                    <td className="py-2 text-gray-700">在庫数</td>
                    <td className="py-2 text-right tabular-nums text-gray-600">{formatNumber(g.stockCount)} 個</td>
                    <td className={`py-2 text-right tabular-nums font-medium ${airStock.currentStock <= 0 ? "text-red-600" : airStock.currentStock <= 10 ? "text-orange-600" : "text-gray-800"}`}>
                      {formatNumber(airStock.currentStock)} 個
                    </td>
                    <td className="py-2 text-right text-gray-400 text-xs">—</td>
                  </tr>
                )}
                {airSales && (
                  <>
                    <tr>
                      <td className="py-2 text-gray-700">販売数</td>
                      <td className="py-2 text-right tabular-nums text-gray-600">{formatNumber(g.sales.salesCount)} 個</td>
                      <td className="py-2 text-right tabular-nums font-medium text-gray-800">{formatNumber(airSales.salesQuantity)} 個</td>
                      <td className={`py-2 text-right tabular-nums text-xs font-medium ${
                        g.sales.salesCount > 0
                          ? Math.round((airSales.salesQuantity / g.sales.salesCount) * 100) >= 100
                            ? "text-green-600"
                            : Math.round((airSales.salesQuantity / g.sales.salesCount) * 100) >= 80
                            ? "text-yellow-600"
                            : "text-red-600"
                          : "text-gray-400"
                      }`}>
                        {g.sales.salesCount > 0
                          ? `${Math.round((airSales.salesQuantity / g.sales.salesCount) * 100)}%`
                          : "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-700">売上</td>
                      <td className="py-2 text-right tabular-nums text-gray-600">{formatCurrency(g.revenue)}</td>
                      <td className="py-2 text-right tabular-nums font-medium text-gray-800">{formatCurrency(airSales.salesAmount)}</td>
                      <td className={`py-2 text-right tabular-nums text-xs font-medium ${
                        g.revenue > 0
                          ? Math.round((airSales.salesAmount / g.revenue) * 100) >= 100
                            ? "text-green-600"
                            : Math.round((airSales.salesAmount / g.revenue) * 100) >= 80
                            ? "text-yellow-600"
                            : "text-red-600"
                          : "text-gray-400"
                      }`}>
                        {g.revenue > 0
                          ? `${Math.round((airSales.salesAmount / g.revenue) * 100)}%`
                          : "—"}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
          {airSales?.targetPeriodStart && (
            <p className="mt-2 text-xs text-blue-600">
              集計期間: {airSales.targetPeriodStart}{airSales.targetPeriodEnd && ` 〜 ${airSales.targetPeriodEnd}`}
            </p>
          )}
        </section>
      )}

      {/* HIT商品のみ派生案セクションを表示 */}
      {evaluation.level === "OK" && (
        <DerivativeSuggestionSection goods={g} />
      )}
    </div>
  );
}
