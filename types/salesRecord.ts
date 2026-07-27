export type SaleType = "normal" | "campaign" | "bundle" | "discount" | "employee_discount";

export interface SalesRecord {
  id: string;
  goodsId: string;
  goodsName: string;        // 記録時点のスナップショット
  variantLabel?: string;    // 例: "黒 / M"（記録時点のスナップショット）
  variantId?: string;
  color?: string;
  size?: string;
  sellingPrice: number;     // 実売単価（actualUnitPrice）
  unitCost: number;
  quantity: number;
  revenue: number;          // sellingPrice × quantity
  grossProfit: number;      // (sellingPrice - unitCost) × quantity
  saleDate: string;         // YYYY-MM-DD
  location: string;
  channel?: "event" | "ec" | "other"; // 販売チャネル（未設定は event 扱い）
  eventId?: string;         // 大会ID（channel=event の場合）
  eventName?: string;       // 大会名スナップショット
  ecCampaignId?: string;    // EC企画ID（channel=ec の場合、企画に紐付けると実績管理に自動集計）
  ecCampaignName?: string;  // EC企画名スナップショット
  saleType?: SaleType;      // 販売種別（未設定は normal 扱い）
  listPrice?: number;       // 定価（分析用：マスタの販売単価）
  discountAmount?: number;  // 値引き額/unit = listPrice - sellingPrice（分析用）
  campaignName?: string;    // 企画名（saleType=campaign のとき）
  bundleId?: string;        // セット販売グループID（saleType=bundle のとき）
  wrestlerOverrideId?: string; // インセンティブ帰属選手の上書き（バリエーション商品用。指定時は商品の紐付けを無視して100%帰属）
  memo?: string;
  createdAt: string;
}
