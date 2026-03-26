/** 取引先管理の型定義 */

export const SUPPLIER_GENRES = [
  "Tシャツ", "タオル", "アクスタ", "キーホルダー",
  "ステッカー", "ポスター", "その他",
] as const;
export type SupplierGenre = (typeof SUPPLIER_GENRES)[number];

export const PRICE_SENSE_OPTIONS = ["安い", "普通", "高い"] as const;
export type PriceSense = (typeof PRICE_SENSE_OPTIONS)[number];

export const DELIVERY_SPEED_OPTIONS = ["早い", "普通", "遅い"] as const;
export type DeliverySpeed = (typeof DELIVERY_SPEED_OPTIONS)[number];

export const QUALITY_LEVEL_OPTIONS = ["高", "中", "低"] as const;
export type QualityLevel = (typeof QUALITY_LEVEL_OPTIONS)[number];

export type SupplierRating = 1 | 2 | 3 | 4 | 5;

export interface Supplier {
  id:            string;
  name:          string;          // 取引先名
  contactName?:  string;          // 担当者名
  phone?:        string;          // 電話番号
  email?:        string;          // メールアドレス
  genres:        SupplierGenre[]; // 対応ジャンル（複数可）
  priceSense:    PriceSense;      // 価格感
  deliveryDays?: number;          // 納期目安（日）
  deliverySpeed: DeliverySpeed;   // 納期感
  minLot?:       number;          // 最低ロット（個）
  quality:       QualityLevel;    // 品質
  rating:        SupplierRating;  // 評価（5段階）
  memo?:         string;          // メモ
  createdAt:     string;          // ISO8601
}

// ─── 表示用定数 ────────────────────────────────────────

export const PRICE_SENSE_STYLE: Record<PriceSense, string> = {
  安い: "bg-green-100 text-green-700",
  普通: "bg-gray-100 text-gray-600",
  高い: "bg-red-100 text-red-600",
};

export const DELIVERY_SPEED_STYLE: Record<DeliverySpeed, string> = {
  早い: "bg-green-100 text-green-700",
  普通: "bg-gray-100 text-gray-600",
  遅い: "bg-yellow-100 text-yellow-700",
};

export const QUALITY_STYLE: Record<QualityLevel, string> = {
  高: "bg-blue-100 text-blue-700",
  中: "bg-gray-100 text-gray-600",
  低: "bg-orange-100 text-orange-700",
};
