/**
 * AI提案由来の商品かどうかを判定し、メモ内容をパースする。
 * saveSuggestion() が生成するメモ形式:
 *   AI提案\n企画理由: ...\nリスク: ...\n根拠: ...
 */
export interface AiMemoData {
  reason: string;
  risk: string;
  insight: string;
}

/** AI提案由来のメモかどうかを判定 */
export function isAiSuggested(memo: string): boolean {
  return memo.startsWith("AI提案");
}

/** AI提案メモをパースして各フィールドを返す */
export function parseAiMemo(memo: string): AiMemoData | null {
  if (!isAiSuggested(memo)) return null;

  const extract = (label: string): string => {
    const match = memo.match(new RegExp(`${label}: ([^\n]+)`));
    return match?.[1]?.trim() ?? "";
  };

  return {
    reason:  extract("企画理由"),
    risk:    extract("リスク"),
    insight: extract("根拠"),
  };
}
