import { csvEscape } from "@/lib/salesCsv";
import { calcGoods } from "@/lib/calculations";
import type { Goods } from "@/types/goods";

/**
 * 商品の原価情報CSV。
 * バリエーションがある商品は1行=1バリエーション（カラー×サイズ）で出力し、
 * 社内販売・割引販売の価格判断に使えるよう原価率と粗利を併記する。
 */
export function buildGoodsCostCsv(goodsList: Goods[]): string {
  const headers = [
    "商品名",
    "カテゴリ",
    "ステータス",
    "発売月",
    "カラー",
    "サイズ",
    "販売単価",
    "原価",
    "粗利",
    "粗利率(%)",
    "原価率(%)",
    "在庫数",
    "販売数",
    "予定製作数",
    "予算額",
    "デザイン費",
    "サンプル費",
    "製造原価",
    "送料",
    "その他経費",
    "合計コスト",
  ];

  const rows: string[] = [];

  for (const goods of goodsList) {
    const g = calcGoods(goods);
    const variants = goods.variants ?? [];
    const base = [
      goods.name,
      goods.category,
      goods.status,
      goods.releaseDate ?? "",
    ];
    const budgetCols = [
      goods.budget.budgetAmount,
      goods.budget.designCost,
      goods.budget.sampleCost,
      goods.budget.manufacturingCost,
      goods.budget.shippingCost,
      goods.budget.otherCost,
      g.totalCost,
    ];

    if (variants.length === 0) {
      const price = goods.sales.sellingPrice;
      rows.push(
        [
          ...base, "", "",
          price, 0, price, price > 0 ? 100 : 0, 0,
          g.stockCount, goods.sales.salesCount, goods.sales.productionCount,
          ...budgetCols,
        ].map(csvEscape).join(",")
      );
      continue;
    }

    for (const v of variants) {
      const price = v.sellingPrice ?? goods.sales.sellingPrice;
      const cost = v.unitCost ?? 0;
      const profit = price - cost;
      const margin = price > 0 ? Math.round((profit / price) * 100) : 0;
      const costRate = price > 0 ? Math.round((cost / price) * 100) : 0;
      rows.push(
        [
          ...base,
          v.color,
          v.size,
          price, cost, profit, margin, costRate,
          v.stockQuantity, v.soldQuantity, v.plannedQuantity,
          ...budgetCols,
        ].map(csvEscape).join(",")
      );
    }
  }

  return [headers.map(csvEscape).join(","), ...rows].join("\r\n");
}
