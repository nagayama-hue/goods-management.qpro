/**
 * 金額を3桁区切りで表示する (例: 1,234,567円)
 */
export function formatCurrency(value: number): string {
  return `¥${value.toLocaleString("ja-JP")}`;
}

/**
 * 粗利率をパーセント表示する (例: 45.2%)
 */
export function formatMargin(margin: number): string {
  return `${(margin * 100).toFixed(1)}%`;
}

/**
 * 数値を3桁区切りで表示する
 */
export function formatNumber(value: number): string {
  return value.toLocaleString("ja-JP");
}
