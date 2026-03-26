export type EventType = "主催大会" | "イベント";

export interface EventTarget {
  id:               string;
  type:             EventType;
  date:             string;      // YYYY-MM-DD（日程未定の場合は月初や仮日程）
  name:             string;
  capacity?:        number;      // 動員目標（人）
  target:           number;      // 売上目標（円）
  actual?:          number;      // 実績売上（円）大会後に入力
  actualCapacity?:  number;      // 実績動員（人）大会後に入力
  memo?:            string;
}
