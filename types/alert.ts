/**
 * アプリ全体の未達アラート型定義。
 * EC / 大会・イベント / 商品 / AI提案 を横断して扱う。
 */

/** アラートの深刻度 */
export type AlertLevel =
  | "critical"     // 🔴 要改善（達成率 < 50% / 評価 NG）
  | "warn"         // 🟡 注意（達成率 50〜79% / 評価 WARN）
  | "info"         // 🔵 入力待ち（実績未入力）
  | "opportunity"; // 🟣 機会損失候補（高優先AI提案・未登録）

/** アラートの発生元カテゴリ */
export type AlertCategory = "ec" | "event" | "goods" | "suggestion";

/** アラート1件 */
export interface AppAlert {
  id:       string;         // 重複排除用の一意キー
  level:    AlertLevel;
  category: AlertCategory;
  label:    string;         // カテゴリ表示ラベル（「EC」「大会」など）
  message:  string;         // 内容テキスト
  href:     string;         // リンク先URL
}
