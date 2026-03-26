/**
 * 商品と取引先の紐付け・発注履歴の型定義。
 * 実務での発注判断・候補比較・引き継ぎを高速化することが目的。
 */

/** 紐付けの種別 */
export type SupplierRelationType = "recommended" | "candidate";

/** 候補取引先の優先区分 */
export const SUPPLIER_PRIORITY_LABELS = ["第一候補", "第二候補", "比較用"] as const;
export type SupplierPriorityLabel = (typeof SUPPLIER_PRIORITY_LABELS)[number];

export const PRIORITY_LABEL_STYLE: Record<SupplierPriorityLabel, string> = {
  第一候補: "bg-blue-100 text-blue-700",
  第二候補: "bg-gray-100 text-gray-600",
  比較用:   "bg-orange-100 text-orange-600",
};

/**
 * 商品と取引先の紐付けレコード。
 * relationType === "recommended" → 推奨取引先（1商品につき1件）
 * relationType === "candidate"  → 候補取引先（複数可）
 * note（recommended）          → 選定理由・注意点などの自由記述
 * note（candidate）            → 候補ごとのメモ
 */
export interface GoodsSupplierLink {
  id:            string;
  goodsId:       string;
  supplierId:    string;
  relationType:  SupplierRelationType;
  priorityLabel?: SupplierPriorityLabel;  // candidate のみ
  note?:         string;
  createdAt:     string;
}

/** 最小発注履歴レコード。将来の発注管理機能に繋がる構造 */
export interface OrderHistory {
  id:             string;
  goodsId:        string;
  supplierId:     string;
  orderDate:      string;         // YYYY-MM-DD
  quantity:       number;         // 発注数量
  unitCost:       number;         // 単価（円）
  totalCost:      number;         // 合計金額（円）
  deliveryDate?:  string;         // 納品日 YYYY-MM-DD
  qualityRating?: 1 | 2 | 3 | 4 | 5;
  memo?:          string;
  createdAt:      string;
}
