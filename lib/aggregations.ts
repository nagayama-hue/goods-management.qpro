import type { GoodsCalculated, GoodsCategory } from "@/types/goods";
import { evaluateGoods } from "@/lib/evaluation";

export interface AggregateRow {
  key: string;
  count: number;
  revenue: number;
  totalCost: number;
  grossProfit: number;
  grossMargin: number;
}

export interface Summary {
  revenue: number;
  totalCost: number;
  grossProfit: number;
  grossMargin: number;
  count: number;
  inventoryValue: number;  // 在庫金額（在庫数 × 製造単価）
  inventoryRate: number;   // 在庫率（在庫数 / 製作数）
}

export interface RankingItem {
  id: string;
  name: string;
  primary: number;   // メイン指標（売上・粗利・在庫数）
  secondary: number; // サブ指標
}

export type StockAlertLevel = "切れ" | "少" | "未設定";

export interface StockAlert {
  id: string;
  name: string;
  category: string;
  stockCount: number;
  productionCount: number;
  status: string;
  level: StockAlertLevel;
}

const STOCK_LOW_THRESHOLD = 10;

/** 商品1件の在庫金額（在庫数 × 製造単価） */
function calcItemInventoryValue(g: GoodsCalculated): number {
  if (g.sales.productionCount <= 0) return 0;
  const unitCost = g.budget.manufacturingCost / g.sales.productionCount;
  return g.stockCount * unitCost;
}

/** 全商品のサマリーを計算する */
export function calcSummary(goods: GoodsCalculated[]): Summary {
  const revenue      = goods.reduce((s, g) => s + g.revenue, 0);
  const totalCost    = goods.reduce((s, g) => s + g.totalCost, 0);
  const grossProfit  = goods.reduce((s, g) => s + g.grossProfit, 0);
  const grossMargin  = revenue > 0 ? grossProfit / revenue : 0;

  // 在庫金額
  const inventoryValue = goods.reduce((s, g) => s + calcItemInventoryValue(g), 0);

  // 在庫率 = Σ在庫数 / Σ製作数（製作数 > 0 の商品のみ）
  const produced = goods.filter((g) => g.sales.productionCount > 0);
  const totalStock    = produced.reduce((s, g) => s + g.stockCount, 0);
  const totalProduced = produced.reduce((s, g) => s + g.sales.productionCount, 0);
  const inventoryRate = totalProduced > 0 ? totalStock / totalProduced : 0;

  return {
    revenue, totalCost, grossProfit, grossMargin,
    count: goods.length, inventoryValue, inventoryRate,
  };
}

function groupBy(
  goods: GoodsCalculated[],
  keyFn: (g: GoodsCalculated) => string
): AggregateRow[] {
  const map = new Map<string, GoodsCalculated[]>();
  for (const g of goods) {
    const key = keyFn(g);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(g);
  }
  return Array.from(map.entries()).map(([key, items]) => {
    const { revenue, totalCost, grossProfit, grossMargin } = calcSummary(items);
    return { key, count: items.length, revenue, totalCost, grossProfit, grossMargin };
  });
}

/** カテゴリ別に集計（粗利降順） */
export function groupByCategory(goods: GoodsCalculated[]): AggregateRow[] {
  return groupBy(goods, (g) => g.category).sort((a, b) => b.grossProfit - a.grossProfit);
}

/** 月別に集計（新しい月順。releaseDate 未設定は末尾） */
export function groupByMonth(goods: GoodsCalculated[]): AggregateRow[] {
  return groupBy(goods, (g) => g.releaseDate ?? "未設定").sort((a, b) => {
    if (a.key === "未設定") return 1;
    if (b.key === "未設定") return -1;
    return b.key.localeCompare(a.key);
  });
}

/** チャネル別に集計（売上降順） */
export function groupByChannel(goods: GoodsCalculated[]): AggregateRow[] {
  return groupBy(goods, (g) => g.salesChannel).sort((a, b) => b.revenue - a.revenue);
}

/** 売上ランキング TOP N */
export function getRankingByRevenue(goods: GoodsCalculated[], limit = 5): RankingItem[] {
  return [...goods]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map((g) => ({ id: g.id, name: g.name, primary: g.revenue, secondary: g.grossProfit }));
}

/** 粗利ランキング TOP N */
export function getRankingByGrossProfit(goods: GoodsCalculated[], limit = 5): RankingItem[] {
  return [...goods]
    .sort((a, b) => b.grossProfit - a.grossProfit)
    .slice(0, limit)
    .map((g) => ({ id: g.id, name: g.name, primary: g.grossProfit, secondary: g.grossMargin }));
}

/** 在庫数ランキング TOP N */
export function getRankingByStock(goods: GoodsCalculated[], limit = 5): RankingItem[] {
  return [...goods]
    .sort((a, b) => b.stockCount - a.stockCount)
    .slice(0, limit)
    .map((g) => ({
      id: g.id,
      name: g.name,
      primary: g.stockCount,
      secondary: calcItemInventoryValue(g),
    }));
}

export interface CategoryAggregate {
  category: GoodsCategory;
  count: number;
  revenue: number;
  totalGrossProfit: number;
  avgGrossMargin: number;
  totalProductionCount: number;
  totalSalesCount: number;
  totalStockCount: number;
  avgInventoryRate: number;
  hitCount: number;  // evaluation "OK" の件数
  ngCount: number;   // evaluation "NG" の件数
}

export interface MonthlyAggregate {
  month: string;            // "2026-03" または "未設定"
  count: number;            // 商品数（＝ その月が releaseDate の商品数）
  revenue: number;
  totalGrossProfit: number;
  avgGrossMargin: number;
  totalStockCount: number;
  avgInventoryRate: number;
  hitCount: number;
  ngCount: number;
}

/** 月別の詳細分析（新しい月順、未設定は末尾） */
export function getMonthlyAnalysis(goods: GoodsCalculated[]): MonthlyAggregate[] {
  const map = new Map<string, GoodsCalculated[]>();
  for (const g of goods) {
    const key = g.releaseDate ?? "未設定";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(g);
  }

  return Array.from(map.entries())
    .map(([month, items]) => {
      const revenue              = items.reduce((s, g) => s + g.revenue, 0);
      const totalGrossProfit     = items.reduce((s, g) => s + g.grossProfit, 0);
      const avgGrossMargin       = revenue > 0 ? totalGrossProfit / revenue : 0;
      const totalProductionCount = items.reduce((s, g) => s + g.sales.productionCount, 0);
      const totalStockCount      = items.reduce((s, g) => s + g.stockCount, 0);
      const avgInventoryRate     = totalProductionCount > 0
        ? totalStockCount / totalProductionCount : 0;
      const hitCount = items.filter((g) => evaluateGoods(g).level === "OK").length;
      const ngCount  = items.filter((g) => evaluateGoods(g).level === "NG").length;

      return { month, count: items.length, revenue, totalGrossProfit, avgGrossMargin, totalStockCount, avgInventoryRate, hitCount, ngCount };
    })
    .sort((a, b) => {
      if (a.month === "未設定") return 1;
      if (b.month === "未設定") return -1;
      return b.month.localeCompare(a.month); // 新しい月順
    });
}

export type PrimaryChannel = "会場" | "EC" | "FC限定";

export interface ChannelAggregate {
  channel: PrimaryChannel;
  count: number;           // このチャネルを含む商品数
  revenue: number;
  totalGrossProfit: number;
  avgGrossMargin: number;
  avgSellingPrice: number; // 平均販売単価
  totalStockCount: number;
  avgInventoryRate: number;
  hitCount: number;
  ngCount: number;
}

/** salesChannel を基本チャネルに展開する（"会場+EC" → ["会場", "EC"]） */
function expandChannels(salesChannel: string): PrimaryChannel[] {
  if (salesChannel === "会場+EC") return ["会場", "EC"];
  if (salesChannel === "会場")    return ["会場"];
  if (salesChannel === "EC")      return ["EC"];
  if (salesChannel === "FC限定")  return ["FC限定"];
  return [];
}

const PRIMARY_CHANNELS: PrimaryChannel[] = ["会場", "EC", "FC限定"];

/** チャネル別の詳細分析（売上降順）。会場+EC 商品は両チャネルに重複カウント */
export function getChannelAnalysis(goods: GoodsCalculated[]): ChannelAggregate[] {
  const map = new Map<PrimaryChannel, GoodsCalculated[]>(
    PRIMARY_CHANNELS.map((ch) => [ch, []])
  );

  for (const g of goods) {
    for (const ch of expandChannels(g.salesChannel)) {
      map.get(ch)!.push(g);
    }
  }

  return PRIMARY_CHANNELS.map((channel) => {
    const items = map.get(channel)!;
    const revenue              = items.reduce((s, g) => s + g.revenue, 0);
    const totalGrossProfit     = items.reduce((s, g) => s + g.grossProfit, 0);
    const avgGrossMargin       = revenue > 0 ? totalGrossProfit / revenue : 0;
    const totalSalesCount      = items.reduce((s, g) => s + g.sales.salesCount, 0);
    const avgSellingPrice      = totalSalesCount > 0 ? revenue / totalSalesCount : 0;
    const totalProductionCount = items.reduce((s, g) => s + g.sales.productionCount, 0);
    const totalStockCount      = items.reduce((s, g) => s + g.stockCount, 0);
    const avgInventoryRate     = totalProductionCount > 0
      ? totalStockCount / totalProductionCount : 0;
    const hitCount = items.filter((g) => evaluateGoods(g).level === "OK").length;
    const ngCount  = items.filter((g) => evaluateGoods(g).level === "NG").length;

    return { channel, count: items.length, revenue, totalGrossProfit, avgGrossMargin, avgSellingPrice, totalStockCount, avgInventoryRate, hitCount, ngCount };
  }).sort((a, b) => b.revenue - a.revenue);
}

/** カテゴリ別の詳細分析（粗利降順） */
export function getCategoryAnalysis(goods: GoodsCalculated[]): CategoryAggregate[] {
  const map = new Map<string, GoodsCalculated[]>();
  for (const g of goods) {
    if (!map.has(g.category)) map.set(g.category, []);
    map.get(g.category)!.push(g);
  }

  return Array.from(map.entries())
    .map(([category, items]) => {
      const revenue             = items.reduce((s, g) => s + g.revenue, 0);
      const totalGrossProfit    = items.reduce((s, g) => s + g.grossProfit, 0);
      const avgGrossMargin      = revenue > 0 ? totalGrossProfit / revenue : 0;
      const totalProductionCount = items.reduce((s, g) => s + g.sales.productionCount, 0);
      const totalSalesCount     = items.reduce((s, g) => s + g.sales.salesCount, 0);
      const totalStockCount     = items.reduce((s, g) => s + g.stockCount, 0);
      const avgInventoryRate    = totalProductionCount > 0
        ? totalStockCount / totalProductionCount : 0;
      const hitCount = items.filter((g) => evaluateGoods(g).level === "OK").length;
      const ngCount  = items.filter((g) => evaluateGoods(g).level === "NG").length;

      return {
        category: category as GoodsCategory,
        count: items.length,
        revenue,
        totalGrossProfit,
        avgGrossMargin,
        totalProductionCount,
        totalSalesCount,
        totalStockCount,
        avgInventoryRate,
        hitCount,
        ngCount,
      };
    })
    .sort((a, b) => b.totalGrossProfit - a.totalGrossProfit);
}

/** 在庫警告リスト */
export function getStockAlerts(goods: GoodsCalculated[]): StockAlert[] {
  const activeStatuses = new Set(["採用", "制作中", "発売中"]);
  const alerts: StockAlert[] = [];

  for (const g of goods) {
    if (g.status === "発売中" && g.stockCount === 0) {
      alerts.push({ id: g.id, name: g.name, category: g.category, stockCount: g.stockCount, productionCount: g.sales.productionCount, status: g.status, level: "切れ" });
    } else if (g.status === "発売中" && g.stockCount <= STOCK_LOW_THRESHOLD) {
      alerts.push({ id: g.id, name: g.name, category: g.category, stockCount: g.stockCount, productionCount: g.sales.productionCount, status: g.status, level: "少" });
    } else if (activeStatuses.has(g.status) && g.sales.productionCount === 0) {
      alerts.push({ id: g.id, name: g.name, category: g.category, stockCount: g.stockCount, productionCount: g.sales.productionCount, status: g.status, level: "未設定" });
    }
  }

  const order: Record<StockAlertLevel, number> = { 切れ: 0, 少: 1, 未設定: 2 };
  return alerts.sort((a, b) => order[a.level] - order[b.level]);
}
