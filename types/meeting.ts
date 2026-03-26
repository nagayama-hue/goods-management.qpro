import type { Priority, GoodsStatus } from "./goods";

export type MeetingResult = "採用" | "保留" | "却下" | "継続検討";

export const MEETING_RESULT_OPTIONS: MeetingResult[] = [
  "採用",
  "継続検討",
  "保留",
  "却下",
];

export const MEETING_RESULT_STYLES: Record<MeetingResult, string> = {
  採用:     "bg-blue-100 text-blue-700",
  保留:     "bg-yellow-100 text-yellow-700",
  却下:     "bg-gray-100 text-gray-400",
  継続検討: "bg-purple-100 text-purple-700",
};

export interface MeetingItem {
  goodsId:   string;
  goodsName: string;      // 会議時点のスナップショット（商品削除後も残る）
  priority:  Priority;    // 会議時点の優先度
  status:    GoodsStatus; // 会議時点のステータス
  result:    MeetingResult;
  comment:   string;      // 任意コメント
}

/**
 * 保存対象の範囲。
 * "filtered" = 会議ビューで表示中の商品のみ（現在の動作）
 * "all"      = 全商品（将来対応予定）
 */
export type MeetingScope = "filtered" | "all";

export interface MeetingHistory {
  id:           string;
  name:         string;                  // 会議名
  date:         string;                  // 実施日 YYYY-MM-DD
  memo:         string;                  // 任意メモ
  createdAt:    string;                  // 記録日時 ISO8601
  scope:        MeetingScope;            // 保存対象の範囲
  filterParams: Record<string, string>;  // 保存時の絞り込み条件（scope="filtered" のとき参照）
  items:        MeetingItem[];
}
