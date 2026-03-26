import type { GoodsCategory, SalesChannel, Priority } from "./goods";

export interface GoodsSuggestion {
  id: string;
  name: string;
  category: GoodsCategory;
  concept: string;
  target: string;
  salesChannel: SalesChannel;
  estimatedPrice: number;   // 想定販売価格
  estimatedCost: number;    // 想定原価
  estimatedProfit: number;  // 想定粗利
  reason: string;           // 企画理由
  dataInsight: string;      // 過去データとの関連
  risk: string;             // リスク
  priority: Priority;
}

export interface DerivativeSuggestion {
  id: string;
  name: string;
  changePoint: string;    // 元商品からの変更ポイント
  estimatedPrice: number;
  estimatedCost: number;
  estimatedProfit: number;
  reason: string;         // なぜ売れるか
  risk: string;
}

export type SuggestionMode =
  | "data"  // 過去データ分析ベース
  | "free"; // 自由発想ベース

export interface SuggestionConditions {
  mode: SuggestionMode;
  count: number;
  categories: GoodsCategory[];  // 空 = 全カテゴリ
  target: string;               // "" = 指定なし
  channel: string;              // "" = 指定なし
  priceRange: string;           // "" | "低" | "中" | "高"
  freeComment: string;
}
