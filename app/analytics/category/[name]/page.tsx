import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllGoods } from "@/lib/store";
import { calcGoods } from "@/lib/calculations";
import { evaluateGoods } from "@/lib/evaluation";
import { getCategoryAnalysis } from "@/lib/aggregations";
import { formatCurrency, formatMargin, formatNumber } from "@/lib/format";
import type { GoodsCalculated, GoodsCategory } from "@/types/goods";
import EvaluationBadge from "@/components/EvaluationBadge";
import StatusBadge from "@/components/StatusBadge";

interface Props {
  params: Promise<{ name: string }>;
}

function GoodsRow({ g }: { g: GoodsCalculated }) {
  const ev = evaluateGoods(g);
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2.5">
        <Link href={`/goods/${g.id}`} className="font-medium text-blue-600 hover:underline">
          {g.name}
        </Link>
      </td>
      <td className="px-4 py-2.5">
        <StatusBadge status={g.status} />
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
        {formatCurrency(g.revenue)}
      </td>
      <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${
        g.grossProfit >= 0 ? "text-green-700" : "text-red-600"
      }`}>
        {formatCurrency(g.grossProfit)}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">
        {formatMargin(g.grossMargin)}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">
        {formatNumber(g.stockCount)}個
      </td>
      <td className="px-4 py-2.5">
        <EvaluationBadge level={ev.level} />
      </td>
    </tr>
  );
}

function GoodsTable({ goods, emptyText }: { goods: GoodsCalculated[]; emptyText: string }) {
  if (goods.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">{emptyText}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
            <th className="px-4 py-2 text-left font-medium">商品名</th>
            <th className="px-4 py-2 text-left font-medium">ステータス</th>
            <th className="px-4 py-2 text-right font-medium">売上</th>
            <th className="px-4 py-2 text-right font-medium">粗利</th>
            <th className="px-4 py-2 text-right font-medium">粗利率</th>
            <th className="px-4 py-2 text-right font-medium">在庫数</th>
            <th className="px-4 py-2 text-left font-medium">評価</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {goods.map((g) => <GoodsRow key={g.id} g={g} />)}
        </tbody>
      </table>
    </div>
  );
}

export default async function CategoryDetailPage({ params }: Props) {
  const { name } = await params;
  const category = decodeURIComponent(name) as GoodsCategory;

  const allGoods = getAllGoods().map(calcGoods);
  const categoryGoods = allGoods.filter((g) => g.category === category);

  if (categoryGoods.length === 0) notFound();

  const analysis = getCategoryAnalysis(allGoods).find((r) => r.category === category);
  if (!analysis) notFound();

  const hitGoods  = categoryGoods.filter((g) => evaluateGoods(g).level === "OK");
  const warnGoods = categoryGoods.filter((g) => evaluateGoods(g).level === "WARN");
  const ngGoods   = categoryGoods.filter((g) => evaluateGoods(g).level === "NG");

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-700">
          ← ダッシュボード
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-gray-900">{category}</h1>
        <p className="mt-1 text-sm text-gray-500">カテゴリ別分析</p>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "商品数",    value: `${analysis.count}件` },
          { label: "総売上",    value: formatCurrency(analysis.revenue) },
          { label: "総粗利",    value: formatCurrency(analysis.totalGrossProfit) },
          { label: "平均粗利率", value: formatMargin(analysis.avgGrossMargin) },
          { label: "総製作数",   value: `${formatNumber(analysis.totalProductionCount)}個` },
          { label: "総販売数",   value: `${formatNumber(analysis.totalSalesCount)}個` },
          { label: "総在庫数",   value: `${formatNumber(analysis.totalStockCount)}個` },
          { label: "平均在庫率", value: formatMargin(analysis.avgInventoryRate) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      {/* HIT商品 */}
      <section className="rounded border border-green-200 bg-white">
        <div className="border-b border-green-100 bg-green-50 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-green-800">
            HIT商品
            <span className="rounded bg-green-600 px-1.5 py-0.5 text-xs text-white">
              {hitGoods.length}件
            </span>
          </h2>
        </div>
        <GoodsTable goods={hitGoods} emptyText="HIT商品はありません。" />
      </section>

      {/* WARN商品 */}
      <section className="rounded border border-yellow-200 bg-white">
        <div className="border-b border-yellow-100 bg-yellow-50 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-yellow-800">
            WARN商品
            <span className="rounded bg-yellow-500 px-1.5 py-0.5 text-xs text-white">
              {warnGoods.length}件
            </span>
          </h2>
        </div>
        <GoodsTable goods={warnGoods} emptyText="WARN商品はありません。" />
      </section>

      {/* NG商品 */}
      <section className="rounded border border-red-200 bg-white">
        <div className="border-b border-red-100 bg-red-50 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-red-800">
            NG商品
            <span className="rounded bg-red-600 px-1.5 py-0.5 text-xs text-white">
              {ngGoods.length}件
            </span>
          </h2>
        </div>
        <GoodsTable goods={ngGoods} emptyText="NG商品はありません。" />
      </section>
    </div>
  );
}
