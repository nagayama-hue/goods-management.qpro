/**
 * EC管理画面の共通計算ロジック。
 * Server Component / Client Component のどちらからも利用可能。
 */

/** 達成率（0–100 の整数）。目標が 0 以下の場合は null */
export function calcPct(actual: number, target: number): number | null {
  if (target <= 0) return null;
  return Math.round((actual / target) * 100);
}

/** 不足額（正 = 不足、負 = 超過） */
export function calcGap(actual: number, target: number): number {
  return target - actual;
}

/**
 * 達成率の閾値
 * ≥ 80: 良好 / ≥ 50: 注意 / < 50: 要改善
 */
export const PCT_THRESHOLDS = { good: 80, warn: 50 } as const;

/** 達成率ラベル */
export function achieveLabel(pct: number | null): string {
  if (pct === null)                return "未入力";
  if (pct >= PCT_THRESHOLDS.good)  return "良好";
  if (pct >= PCT_THRESHOLDS.warn)  return "注意";
  return "要改善";
}

/** テーブルセルの背景色クラス */
export function achieveBg(pct: number | null): string {
  if (pct === null)                return "";
  if (pct >= PCT_THRESHOLDS.good)  return "bg-green-50";
  if (pct >= PCT_THRESHOLDS.warn)  return "bg-yellow-50";
  return "bg-red-50";
}

/** テキスト色クラス */
export function achieveTextColor(pct: number | null): string {
  if (pct === null)                return "text-gray-300";
  if (pct >= PCT_THRESHOLDS.good)  return "text-green-600";
  if (pct >= PCT_THRESHOLDS.warn)  return "text-yellow-600";
  return "text-red-500";
}

/** インラインバッジ（背景＋テキスト） */
export function achieveBadgeClass(pct: number | null): string {
  if (pct === null)                return "bg-gray-100 text-gray-400";
  if (pct >= PCT_THRESHOLDS.good)  return "bg-green-100 text-green-700";
  if (pct >= PCT_THRESHOLDS.warn)  return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-600";
}

/** プログレスバーの幅（0–100 に制限） */
export function progressWidth(pct: number | null): number {
  if (pct === null) return 0;
  return Math.min(100, pct);
}

/** プログレスバーの色クラス */
export function progressBarColor(pct: number | null): string {
  if (pct === null)                return "bg-gray-200";
  if (pct >= PCT_THRESHOLDS.good)  return "bg-green-500";
  if (pct >= PCT_THRESHOLDS.warn)  return "bg-yellow-400";
  return "bg-red-400";
}
