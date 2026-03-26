export type ScoreLevel = "高い" | "中" | "低い";

export interface GoodsScore {
  score:        number;    // 0〜100
  level:        ScoreLevel;
  plusReasons:  string[];  // 加点要因
  minusReasons: string[];  // 減点要因
}

/**
 * スコア算出の重み設定。
 * この数値を変更するだけで全スコアのチューニングが可能。
 */
export const SCORE_WEIGHTS = {
  grossMargin:   { max: 20, label: "粗利率"         },
  inventoryRate: { max: 15, label: "在庫効率"       },
  salesCount:    { max: 15, label: "販売実績"       },
  categoryCtx:   { max: 10, label: "カテゴリ実績"  },
  hitNgTrend:    { max: 10, label: "HIT/NG傾向"    },
} as const;

/** スコア区分の閾値 */
export const SCORE_THRESHOLDS = {
  high: 70,  // 70以上 → 高い
  mid:  40,  // 40以上 → 中
} as const;

export function toScoreLevel(score: number): ScoreLevel {
  if (score >= SCORE_THRESHOLDS.high) return "高い";
  if (score >= SCORE_THRESHOLDS.mid)  return "中";
  return "低い";
}
