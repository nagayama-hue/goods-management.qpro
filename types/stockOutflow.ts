export type OutflowType = "贈答" | "サンプル" | "協賛提供" | "その他";

export interface StockOutflow {
  id: string;
  goodsId: string;
  goodsName: string;
  variantId: string;
  color: string;
  size: string;
  quantity: number;
  outflowType: OutflowType;
  date: string;        // YYYY-MM-DD
  memo: string;
  createdAt: string;
}
