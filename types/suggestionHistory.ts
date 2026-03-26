import type { GoodsSuggestion, SuggestionConditions, SuggestionMode } from "./suggestion";

export type HistoryMode = SuggestionMode | "monthly" | "derivative";

/** 履歴に保存する提案1件（商品登録との紐付けを追加） */
export interface SavedSuggestionItem extends GoodsSuggestion {
  registeredGoodsId?: string; // 商品登録済みの場合に設定
}

/** AI提案1セッション分の履歴 */
export interface SuggestionHistory {
  id: string;
  createdAt: string;
  mode: HistoryMode;
  conditions?: SuggestionConditions; // 月次・派生提案は省略可
  baseGoodsId?: string;              // 派生提案の場合：元商品ID
  suggestions: SavedSuggestionItem[];
  memo?: string;
}
