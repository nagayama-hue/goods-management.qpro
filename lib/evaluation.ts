import type { GoodsCalculated, GoodsEvaluation, EvaluationReason } from "@/types/goods";

// 判定しきい値
const INVENTORY_RATE_THRESHOLD = 0.5;  // 在庫率 50%以上 → 在庫過多
const GROSS_MARGIN_THRESHOLD   = 0.2;  // 粗利率 20%以下 → 低粗利
const SALES_COUNT_THRESHOLD    = 5;    // 販売数 5個以下 → 低販売数

// 評価対象外のステータス（未発売のため販売数0は正常）
const EXCLUDED_STATUSES = new Set(["案出し中", "検討中"]);

/**
 * 商品1件を評価して GoodsEvaluation を返す。
 * 評価対象外の商品は常に OK を返す。
 */
export function evaluateGoods(goods: GoodsCalculated): GoodsEvaluation {
  if (EXCLUDED_STATUSES.has(goods.status)) {
    return { level: "OK", reasons: [] };
  }

  const reasons: EvaluationReason[] = [];

  // 在庫過多: 製作数 > 0 かつ 在庫率 >= しきい値
  if (goods.sales.productionCount > 0) {
    const inventoryRate = goods.stockCount / goods.sales.productionCount;
    if (inventoryRate >= INVENTORY_RATE_THRESHOLD) {
      reasons.push("在庫過多");
    }
  }

  // 低粗利: 売上 > 0 かつ 粗利率 <= しきい値
  if (goods.revenue > 0 && goods.grossMargin <= GROSS_MARGIN_THRESHOLD) {
    reasons.push("低粗利");
  }

  // 低販売数: 販売数 <= しきい値
  if (goods.sales.salesCount <= SALES_COUNT_THRESHOLD) {
    reasons.push("低販売数");
  }

  const level =
    reasons.length >= 2 ? "NG"   :
    reasons.length === 1 ? "WARN" : "OK";

  return { level, reasons };
}

/** しきい値を参照用にエクスポート（詳細画面の表示に使用） */
export const THRESHOLDS = {
  inventoryRate: INVENTORY_RATE_THRESHOLD,
  grossMargin:   GROSS_MARGIN_THRESHOLD,
  salesCount:    SALES_COUNT_THRESHOLD,
} as const;
