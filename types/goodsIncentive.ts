/**
 * インセンティブ区分
 * - personal: 選手個人グッズ（会場・EC 売上の5%）
 * - multi:    複数選手・タッグデザイン（売上の5%を紐付け選手の按分%で分配）
 * - all:      全選手展開（アクキー・ポートレート等。紐付け不要、売上登録時に売れた選手を指定して帰属）
 * - org:      団体共通グッズ（対象外）
 */
export type IncentiveCategory = "personal" | "multi" | "all" | "org";

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
