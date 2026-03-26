import type { Goods, GoodsBudget, GoodsSales, GoodsCalculated } from "@/types/goods";

/**
 * 合計コスト = デザイン費 + サンプル費 + 製造原価 + 送料 + その他経費
 * ※予算額は計画値のため合計コストには含めない
 */
export function calcTotalCost(budget: GoodsBudget): number {
  return (
    budget.designCost +
    budget.sampleCost +
    budget.manufacturingCost +
    budget.shippingCost +
    budget.otherCost
  );
}

/** 売上 = 販売価格 × 販売数 */
export function calcRevenue(sales: GoodsSales): number {
  return sales.sellingPrice * sales.salesCount;
}

/** 粗利 = 売上 - 合計コスト */
export function calcGrossProfit(revenue: number, totalCost: number): number {
  return revenue - totalCost;
}

/** 粗利率 = 売上 > 0 ? 粗利 / 売上 : 0 */
export function calcGrossMargin(grossProfit: number, revenue: number): number {
  if (revenue <= 0) return 0;
  return grossProfit / revenue;
}

/** 在庫数 = 製作数 - 販売数 */
export function calcStockCount(sales: GoodsSales): number {
  return sales.productionCount - sales.salesCount;
}

/** Goods に計算結果を付与して返す */
export function calcGoods(goods: Goods): GoodsCalculated {
  const totalCost = calcTotalCost(goods.budget);
  const revenue = calcRevenue(goods.sales);
  const grossProfit = calcGrossProfit(revenue, totalCost);
  const grossMargin = calcGrossMargin(grossProfit, revenue);
  const stockCount = calcStockCount(goods.sales);

  return { ...goods, totalCost, revenue, grossProfit, grossMargin, stockCount };
}
