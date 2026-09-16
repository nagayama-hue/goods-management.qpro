/** 差異の理由（棚卸しで実数とシステム在庫がズレた原因） */
export type DiffReason =
  | "売上登録漏れ"
  | "出庫登録漏れ"
  | "紛失・破損"
  | "数え間違い"
  | "その他";

export const DIFF_REASONS: DiffReason[] = [
  "売上登録漏れ",
  "出庫登録漏れ",
  "紛失・破損",
  "数え間違い",
  "その他",
];

/** 棚卸しの1行（商品×バリエーション単位） */
export interface StocktakeLine {
  goodsId: string;
  goodsName: string;        // 記録時点のスナップショット
  variantId: string;
  color: string;
  size: string;
  /** 理論在庫（この行を最後に保存した時点のシステム在庫） */
  theoretical: number;
  /** 実数。未入力は undefined */
  actual?: number;
  /** 差異がある場合の理由 */
  reason?: DiffReason;
  memo?: string;
}

export type StocktakeStatus = "draft" | "confirmed";

export interface Stocktake {
  id: string;
  /** 実施日 YYYY-MM-DD */
  date: string;
  /** 担当者名 */
  staff: string;
  status: StocktakeStatus;
  lines: StocktakeLine[];
  memo?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
}
