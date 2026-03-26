import Link from "next/link";
import { getAllGoods } from "@/lib/store";
import { calcGoods } from "@/lib/calculations";
import { scoreGoods } from "@/lib/scoring";
import { formatCurrency } from "@/lib/format";
import { getAllAirregiStocks, getAllAirregiProducts } from "@/lib/airregiStore";
import GoodsTable from "@/components/GoodsTable";
import type { SortKey, AirregiSyncInfo } from "@/components/GoodsTable";
import type { GoodsCalculated, Priority } from "@/types/goods";
import type { GoodsScore } from "@/types/score";
import { PRIORITY_OPTIONS, PRIORITY_STYLES } from "@/lib/constants";

type SortDir = "asc" | "desc";

const SORT_KEYS: SortKey[] = ["revenue", "grossProfit", "stockCount", "sellingPrice", "score"];

function sortGoods(
  goods: GoodsCalculated[],
  key: SortKey,
  dir: SortDir,
  scores: Record<string, GoodsScore>
): GoodsCalculated[] {
  return [...goods].sort((a, b) => {
    let va: number, vb: number;
    if (key === "score") {
      va = scores[a.id]?.score ?? 0;
      vb = scores[b.id]?.score ?? 0;
    } else if (key === "sellingPrice") {
      va = a.sales.sellingPrice;
      vb = b.sales.sellingPrice;
    } else {
      va = a[key];
      vb = b[key];
    }
    return dir === "asc" ? va - vb : vb - va;
  });
}

interface Props {
  searchParams: Promise<{ sort?: string; dir?: string; planning?: string }>;
}

const FILTER_TABS: { value: string; label: string }[] = [
  { value: "", label: "全て" },
  ...PRIORITY_OPTIONS.map((p) => ({ value: p, label: p })),
];

export default async function HomePage({ searchParams }: Props) {
  const { sort, dir, planning } = await searchParams;
  const sortKey: SortKey  = SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : "grossProfit";
  const sortDir: SortDir  = dir === "asc" ? "asc" : "desc";
  const planningFilter    = planning ?? "";

  const allGoods = getAllGoods().map(calcGoods);

  // スコアを全商品で一括計算（カテゴリ比較のため allGoods を渡す）
  const scoresMap: Record<string, GoodsScore> = Object.fromEntries(
    allGoods.map((g) => [g.id, scoreGoods(g, allGoods)])
  );

  // Airレジ連携サマリー
  const airStocks          = getAllAirregiStocks();
  const airProducts        = getAllAirregiProducts();
  const airStockByCode     = new Map(airStocks.map((s) => [s.productCode, s]));
  const airProductByCode   = new Map(airProducts.map((p) => [p.productCode, p]));
  const codeSetCount       = allGoods.filter((g) => g.airregiProductCode).length;
  // 在庫 or 商品マスタのどちらかで一致していれば「連携済み」とみなす
  const airLinkedCount     = allGoods.filter((g) =>
    g.airregiProductCode &&
    (airStockByCode.has(g.airregiProductCode) || airProductByCode.has(g.airregiProductCode))
  ).length;
  const airUnlinkedCount   = allGoods.length - codeSetCount;

  // Airレジ連携状態マップ（商品ID → 連携情報）
  const airregiSyncMap: Record<string, AirregiSyncInfo> = Object.fromEntries(
    allGoods.map((g) => {
      if (!g.airregiProductCode) return [g.id, { status: "unlinked" as const }];
      const stock   = airStockByCode.get(g.airregiProductCode);
      const product = airProductByCode.get(g.airregiProductCode);
      const isLinked = Boolean(stock || product);
      return [g.id, {
        status:              isLinked ? ("linked" as const) : ("missing" as const),
        stock:               stock?.currentStock,
        airregiProductCode:  g.airregiProductCode,
        airregiPrice:        product?.unitPrice,
        isVisible:           product?.isVisible,
      }];
    })
  );

  // 優先度フィルター
  const filtered = planningFilter
    ? allGoods.filter((g) => g.priority === (planningFilter as Priority))
    : allGoods;

  const sorted = sortGoods(filtered, sortKey, sortDir, scoresMap);

  const totalRevenue = allGoods.reduce((s, g) => s + g.revenue, 0);
  const totalProfit  = allGoods.reduce((s, g) => s + g.grossProfit, 0);
  const activeCount  = allGoods.filter(
    (g) => g.status === "制作中" || g.status === "発売中"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">商品一覧</h1>
        <Link
          href="/goods/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 新規登録
        </Link>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">総商品数</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{allGoods.length}</p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">進行中</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600">{activeCount}</p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">累計売上</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">累計粗利</p>
          <p className={`mt-1 text-2xl font-semibold ${totalProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
            {formatCurrency(totalProfit)}
          </p>
        </div>
      </div>

      {/* Airレジ連携バナー（データ取込済みの場合のみ表示） */}
      {airStocks.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs">
          <span className="font-medium text-gray-600">Airレジ連携</span>
          {airLinkedCount > 0 && (
            <span className="text-green-700">在庫一致: {airLinkedCount}件</span>
          )}
          {airUnlinkedCount > 0 && (
            <span className="text-orange-600">コード未設定: {airUnlinkedCount}件</span>
          )}
          <Link href="/airregi" className="ml-auto text-gray-400 hover:text-gray-600 hover:underline">
            Airレジ管理 →
          </Link>
        </div>
      )}

      {/* 優先度フィルタータブ */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => {
          const isActive = tab.value === planningFilter;
          const href = tab.value
            ? `?planning=${encodeURIComponent(tab.value)}&sort=${sortKey}&dir=${sortDir}`
            : `?sort=${sortKey}&dir=${sortDir}`;
          const activeStyle = tab.value
            ? PRIORITY_STYLES[tab.value as Priority]
            : "bg-gray-800 text-white";
          return (
            <Link
              key={tab.value}
              href={href}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? activeStyle
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
              {tab.value && (
                <span className="ml-1 text-xs opacity-70">
                  ({allGoods.filter((g) => g.priority === tab.value).length})
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* テーブル */}
      <div className="rounded border border-gray-200 bg-white">
        <GoodsTable
          goods={sorted}
          sortKey={sortKey}
          sortDir={sortDir}
          scores={scoresMap}
          planning={planningFilter || undefined}
          airregiSyncMap={airregiSyncMap}
        />
      </div>
    </div>
  );
}
