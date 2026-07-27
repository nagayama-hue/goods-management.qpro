/**
 * インセンティブ区分
 * - personal: 選手個人グッズ（会場・EC 5% の対象）
 * - multi:    複数選手デザイン（現行制度では 5% 対象外。手売り10%は対象。按分は将来対象化の布石）
 * - org:      団体共通グッズ（同上）
 */
export type IncentiveCategory = "personal" | "multi" | "org";

export interface WrestlerLink {
  wrestlerId: string;
  /** 按分%。personal は1選手100。multi は合計100 */
  sharePercent: number;
}

/** 商品ごとのインセンティブ設定（goods.json とは別コレクション。既存スキーマ無変更） */
export interface GoodsIncentive {
  goodsId: string;
  category: IncentiveCategory;
  links: WrestlerLink[];
  updatedAt: string;
}
