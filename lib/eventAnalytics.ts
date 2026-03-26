/**
 * 大会・イベント管理の共通計算ロジック。
 * Server Component / Client Component のどちらからも利用可能。
 * 達成率の色・ラベル表示は lib/ecAnalytics の関数を共用する。
 */

import type { EventTarget } from "@/types/event";

// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────

/** 月別集計 */
export interface MonthStats {
  ym:              string;        // YYYY-MM
  capacityTarget:  number;        // 月合計 動員目標（0 = 未設定）
  capacityActual:  number | null; // 月合計 実績動員（null = 未入力）
  salesTarget:     number;        // 月合計 売上目標
  salesActual:     number | null; // 月合計 実績売上（null = 未入力）
  eventCount:      number;        // 大会数
  salesDoneCount:  number;        // 売上実績入力済み件数
  capDoneCount:    number;        // 動員実績入力済み件数
}

/** 年間集計 */
export interface AnnualStats {
  capacityTarget:  number;
  capacityActual:  number | null;
  salesTarget:     number;
  salesActual:     number | null;
  totalCount:      number;
  salesDoneCount:  number;
  capDoneCount:    number;
}

// ─────────────────────────────────────────────
// 状態判定
// ─────────────────────────────────────────────

/** 大会の状態（完了 / 要入力 / 予定）を返す */
export function getEventStatus(ev: EventTarget): { label: string; cls: string } {
  const today = new Date().toISOString().slice(0, 10);
  if (ev.actual !== undefined) return { label: "完了",   cls: "text-green-600 font-semibold" };
  if (ev.date < today)         return { label: "要入力", cls: "text-orange-500 font-semibold" };
  return                              { label: "予定",   cls: "text-gray-400" };
}

// ─────────────────────────────────────────────
// 集計
// ─────────────────────────────────────────────

/** イベント配列を月（YYYY-MM）でグループ化する */
function groupByMonth(events: EventTarget[]): Map<string, EventTarget[]> {
  const map = new Map<string, EventTarget[]>();
  for (const ev of events) {
    const ym = ev.date.slice(0, 7);
    if (!map.has(ym)) map.set(ym, []);
    map.get(ym)!.push(ev);
  }
  return map;
}

/** 月別集計を返す（日付昇順） */
export function buildMonthStats(events: EventTarget[]): MonthStats[] {
  const map = groupByMonth(events);

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, evs]) => {
      const salesDone = evs.filter((e) => e.actual          !== undefined);
      const capDone   = evs.filter((e) => e.actualCapacity  !== undefined);

      return {
        ym,
        capacityTarget:  evs.reduce((s, e) => s + (e.capacity ?? 0), 0),
        capacityActual:  capDone.length  > 0
          ? capDone.reduce((s, e)  => s + (e.actualCapacity ?? 0), 0)
          : null,
        salesTarget:     evs.reduce((s, e) => s + e.target, 0),
        salesActual:     salesDone.length > 0
          ? salesDone.reduce((s, e) => s + (e.actual ?? 0), 0)
          : null,
        eventCount:      evs.length,
        salesDoneCount:  salesDone.length,
        capDoneCount:    capDone.length,
      };
    });
}

/** 年間集計を返す */
export function buildAnnualStats(events: EventTarget[]): AnnualStats {
  const salesDone = events.filter((e) => e.actual          !== undefined);
  const capDone   = events.filter((e) => e.actualCapacity  !== undefined);

  return {
    capacityTarget:  events.reduce((s, e) => s + (e.capacity ?? 0), 0),
    capacityActual:  capDone.length  > 0
      ? capDone.reduce((s, e)  => s + (e.actualCapacity ?? 0), 0)
      : null,
    salesTarget:     events.reduce((s, e) => s + e.target, 0),
    salesActual:     salesDone.length > 0
      ? salesDone.reduce((s, e) => s + (e.actual ?? 0), 0)
      : null,
    totalCount:      events.length,
    salesDoneCount:  salesDone.length,
    capDoneCount:    capDone.length,
  };
}
