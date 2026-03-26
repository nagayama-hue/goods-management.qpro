import type { GoodsCalculated } from "@/types/goods";
import type { GoodsScore } from "@/types/score";
import { toScoreLevel } from "@/types/score";

/**
 * 商品1件の「売れる確率スコア」をルールベースで算出する。
 * evaluateGoods() と同じく GoodsCalculated を入力とする。
 *
 * @param goods      スコアリング対象の商品
 * @param allGoods   カテゴリ実績比較用の全商品リスト（省略可）
 */
export function scoreGoods(
  goods: GoodsCalculated,
  allGoods: GoodsCalculated[] = []
): GoodsScore {
  let score = 50; // ベーススコア
  const plus:  string[] = [];
  const minus: string[] = [];

  // ── 1. 粗利率（実績 or 企画段階の想定値）────────────────────────────────
  // 実売上があれば実績粗利率、なければ製造原価から想定粗利率を推定する
  let effectiveMargin = 0;
  let hasMarginData   = false;

  if (goods.revenue > 0) {
    effectiveMargin = goods.grossMargin;
    hasMarginData   = true;
  } else if (goods.sales.sellingPrice > 0 && goods.budget.manufacturingCost > 0) {
    // 企画段階: 製造原価ベースの想定粗利率
    effectiveMargin = (goods.sales.sellingPrice - goods.budget.manufacturingCost)
      / goods.sales.sellingPrice;
    hasMarginData = true;
  }

  if (hasMarginData) {
    if (effectiveMargin >= 0.4) {
      score += 20; plus.push("粗利率40%以上（高収益）");
    } else if (effectiveMargin >= 0.3) {
      score += 10; plus.push("粗利率30%以上");
    } else if (effectiveMargin < 0.1) {
      score -= 20; minus.push("粗利率10%未満（採算リスク大）");
    } else if (effectiveMargin < 0.2) {
      score -= 10; minus.push("粗利率20%未満（低収益）");
    }
  }

  // ── 2. 在庫効率（製作実績がある場合のみ）────────────────────────────────
  if (goods.sales.productionCount > 0) {
    const invRate = goods.stockCount / goods.sales.productionCount;

    if (invRate <= 0.2) {
      score += 15; plus.push("在庫率20%以下（よく売れている）");
    } else if (invRate <= 0.5) {
      score += 5;  // 普通
    } else if (invRate <= 0.7) {
      score -= 10; minus.push("在庫率50%超（在庫リスクあり）");
    } else {
      score -= 15; minus.push("在庫率70%超（深刻な在庫過多）");
    }
  }

  // ── 3. 販売実績（製作実績がある場合のみ）────────────────────────────────
  if (goods.sales.productionCount > 0) {
    const sc = goods.sales.salesCount;

    if (sc >= 30) {
      score += 15; plus.push("販売数30個以上（高販売実績）");
    } else if (sc >= 15) {
      score += 8;  plus.push("販売数15個以上");
    } else if (sc >= 5) {
      score += 3;  // 最低限あり
    } else if (sc <= 0) {
      score -= 15; minus.push("販売数0（実績なし）");
    } else {
      score -= 5;  minus.push("販売数が少ない（5個未満）");
    }
  }

  // ── 4. カテゴリ実績（同カテゴリの平均粗利率と比較）──────────────────────
  const sameCategory = allGoods.filter(
    (g) => g.category === goods.category && g.id !== goods.id && g.revenue > 0
  );

  if (sameCategory.length >= 2 && hasMarginData) {
    const avgMargin =
      sameCategory.reduce((s, g) => s + g.grossMargin, 0) / sameCategory.length;
    const avgPct = Math.round(avgMargin * 100);

    if (effectiveMargin > avgMargin + 0.05) {
      score += 10;
      plus.push(`同カテゴリ平均粗利率（${avgPct}%）より高い`);
    } else if (effectiveMargin < avgMargin - 0.05 && effectiveMargin > 0) {
      score -= 10;
      minus.push(`同カテゴリ平均粗利率（${avgPct}%）より低い`);
    }
  }

  // ── 5. HIT/NG 傾向（製作実績がある場合のみ）────────────────────────────
  if (goods.sales.productionCount > 0) {
    const invRate     = goods.stockCount / goods.sales.productionCount;
    const hasInvIssue    = invRate >= 0.5;
    const hasMarginIssue = goods.revenue > 0 && goods.grossMargin <= 0.2;
    const hasSalesIssue  = goods.sales.salesCount <= 5;
    const issueCount     = [hasInvIssue, hasMarginIssue, hasSalesIssue].filter(Boolean).length;

    if (issueCount >= 2) {
      score -= 10; minus.push("複数の問題指標あり（NG傾向）");
    } else if (issueCount === 0 && goods.sales.salesCount > 10) {
      score += 10; plus.push("問題指標なし・高販売数（HIT傾向）");
    }
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score:        finalScore,
    level:        toScoreLevel(finalScore),
    plusReasons:  plus,
    minusReasons: minus,
  };
}
