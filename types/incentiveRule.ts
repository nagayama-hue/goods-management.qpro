/** インセンティブ計算のチャネル（売上実績の channel とは別概念。event/other → venue に読み替え） */
export type IncentiveChannel = "venue" | "ec" | "hand" | "all";

/** 計算基準: 売上額の% / 粗利の% / 1個あたり定額 */
export type IncentiveBasis = "sales" | "profit" | "fixed";

export interface IncentiveRule {
  id: string;
  /** null は全選手デフォルト */
  wrestlerId: string | null;
  channel: IncentiveChannel;
  basis: IncentiveBasis;
  /** % または 円/個（basis=fixed のとき） */
  value: number;
  /** 適用開始日 YYYY-MM-DD。率変更の履歴を保持し、過去分の再計算ズレを防ぐ */
  startDate: string;
  note?: string;
}
