import type { GoodsSuggestion } from "@/types/suggestion";
import type { GoodsCalculated } from "@/types/goods";
import type { GoodsScore } from "@/types/score";
import { toScoreLevel } from "@/types/score";

/**
 * AI提案1件の「売れる確率スコア」をルールベースで算出する。
 * 実績データがないため、想定価格・原価・カテゴリ・優先度・既存実績で評価する。
 *
 * @param suggestion  スコアリング対象のAI提案
 * @param allGoods    カテゴリ実績比較用の全商品リスト（省略可）
 */
export function scoreSuggestion(
  suggestion: GoodsSuggestion,
  allGoods: GoodsCalculated[] = []
): GoodsScore {
  let score = 50;
  const plus:  string[] = [];
  const minus: string[] = [];

  // ── 1. 想定粗利率 ──────────────────────────────────────────────────────
  const estimatedMargin =
    suggestion.estimatedPrice > 0
      ? suggestion.estimatedProfit / suggestion.estimatedPrice
      : 0;

  if (estimatedMargin >= 0.4) {
    score += 20; plus.push("想定粗利率40%以上");
  } else if (estimatedMargin >= 0.3) {
    score += 10; plus.push("想定粗利率30%以上");
  } else if (estimatedMargin < 0.1 && suggestion.estimatedPrice > 0) {
    score -= 20; minus.push("想定粗利率10%未満（採算リスク大）");
  } else if (estimatedMargin < 0.2 && suggestion.estimatedPrice > 0) {
    score -= 10; minus.push("想定粗利率20%未満（低収益）");
  }

  // ── 2. AIが設定した優先度 ─────────────────────────────────────────────
  if (suggestion.priority === "今すぐ作る") {
    score += 10; plus.push("AI判定：今すぐ作る");
  } else if (suggestion.priority === "次月候補") {
    score += 5;  plus.push("AI判定：次月候補");
  } else if (suggestion.priority === "保留") {
    score -= 5;  minus.push("AI判定：保留");
  }

  // ── 3. 同カテゴリの既存商品実績 ──────────────────────────────────────
  const sameCategory = allGoods.filter(
    (g) => g.category === suggestion.category && g.revenue > 0
  );

  if (sameCategory.length >= 1) {
    const avgMargin =
      sameCategory.reduce((s, g) => s + g.grossMargin, 0) / sameCategory.length;
    const avgPct = Math.round(avgMargin * 100);

    // HIT実績の定義: 在庫率<30%、粗利率≥30%、販売数≥10
    const hitCount = sameCategory.filter((g) => {
      const inv = g.sales.productionCount > 0
        ? g.stockCount / g.sales.productionCount : 1;
      return inv < 0.3 && g.grossMargin >= 0.3 && g.sales.salesCount >= 10;
    }).length;

    if (hitCount > 0) {
      score += 10;
      plus.push(`同カテゴリにHIT実績あり（${hitCount}件）`);
    } else if (sameCategory.length >= 2 && avgMargin < 0.15) {
      score -= 5;
      minus.push(`同カテゴリの平均粗利率が低い（${avgPct}%）`);
    }

    if (estimatedMargin > avgMargin + 0.05) {
      score += 5;  plus.push("同カテゴリ平均より高い想定粗利率");
    }
  } else {
    // 実績なしカテゴリはわずかにリスクポイント
    minus.push("同カテゴリの販売実績なし");
    score -= 3;
  }

  // ── 4. 販売チャネル適性 ───────────────────────────────────────────────
  if (suggestion.salesChannel === "会場" || suggestion.salesChannel === "会場+EC") {
    score += 5; plus.push("会場販売対応（即時販売が期待できる）");
  } else if (suggestion.salesChannel === "EC") {
    // EC単体は在庫リスクあり
    score += 0;
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score:        finalScore,
    level:        toScoreLevel(finalScore),
    plusReasons:  plus,
    minusReasons: minus,
  };
}
