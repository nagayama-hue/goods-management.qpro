export interface SalesRecord {
  id: string;
  goodsId: string;
  goodsName: string;        // 記録時点のスナップショット
  variantLabel?: string;    // 例: "黒 / M"（記録時点のスナップショット）
  variantId?: string;
  color?: string;
  size?: string;
  sellingPrice: number;
  unitCost: number;
  quantity: number;
  revenue: number;          // sellingPrice × quantity
  grossProfit: number;      // (sellingPrice - unitCost) × quantity
  saleDate: string;         // YYYY-MM-DD
  location: string;
  eventId?: string;         // 大会ID（大会経由で登録した場合）
  eventName?: string;       // 大会名スナップショット
  memo?: string;
  createdAt: string;
}
