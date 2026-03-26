export type GoodsStatus =
  | "案出し中"
  | "検討中"
  | "採用"
  | "制作中"
  | "発売中"
  | "完売"
  | "終了";

export type GoodsCategory =
  | "Tシャツ"
  | "パーカー・スウェット"
  | "タオル"
  | "アクスタ"
  | "キーホルダー"
  | "キャップ・バッグ"
  | "ステッカー・クリアファイル"
  | "応援グッズ"
  | "書籍・カレンダー"
  | "ポートレート・写真"
  | "ガチャガチャ"
  | "FC特典"
  | "その他";

export type SalesChannel = "会場" | "EC" | "FC限定" | "会場+EC";

/** 企画判断としての優先度（制作工程のステータスとは別概念） */
export type Priority =
  | "今すぐ作る"
  | "次月候補"
  | "保留"
  | "却下"
  | "未設定";

export interface GoodsBudget {
  budgetAmount: number;       // 予算額
  designCost: number;         // デザイン費
  sampleCost: number;         // サンプル費
  manufacturingCost: number;  // 製造原価
  shippingCost: number;       // 送料
  otherCost: number;          // その他経費
}

export interface GoodsSales {
  sellingPrice: number;       // 販売価格
  productionCount: number;    // 製作数
  salesCount: number;         // 販売数
}

export interface Goods {
  id: string;
  name: string;
  releaseDate?: string;          // 発売月 YYYY-MM（月別集計に使用）
  category: GoodsCategory;
  concept: string;
  target: string;
  salesChannel: SalesChannel;
  status: GoodsStatus;
  priority: Priority;
  memo: string;
  budget: GoodsBudget;
  sales: GoodsSales;
  /** Airレジ連携用商品コード。Airレジ側の商品コードと一致させる。 */
  airregiProductCode?: string;
  createdAt: string;
  updatedAt: string;
}

export type EvaluationLevel = "OK" | "WARN" | "NG";

export type EvaluationReason = "在庫過多" | "低粗利" | "低販売数";

export interface GoodsEvaluation {
  level: EvaluationLevel;
  reasons: EvaluationReason[];
}

/** 計算結果を付与した表示用の型 */
export interface GoodsCalculated extends Goods {
  totalCost: number;      // 合計コスト
  revenue: number;        // 売上
  grossProfit: number;    // 粗利
  grossMargin: number;    // 粗利率 (0〜1)
  stockCount: number;     // 在庫数
}
