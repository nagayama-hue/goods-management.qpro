/**
 * 未達アラート判定エンジン。
 * EC / 大会・イベント / 商品 / AI提案 を横断して AppAlert[] を生成する。
 * Server Component から呼び出す想定。副作用なし。
 */

import type { EcCampaign } from "@/types/ecCampaign";
import type { EventTarget } from "@/types/event";
import type { GoodsCalculated } from "@/types/goods";
import type { SuggestionHistory } from "@/types/suggestionHistory";
import type { AppAlert } from "@/types/alert";
import { calcPct } from "@/lib/ecAnalytics";
import { evaluateGoods } from "@/lib/evaluation";
import { getAllAirregiStocks } from "@/lib/airregiStore";

// ─────────────────────────────────────────────
// 閾値定数
// ─────────────────────────────────────────────

/** 達成率 80%未満 → 注意 */
const PCT_WARN     = 80;
/** 達成率 50%未満 → 要改善 */
const PCT_CRITICAL = 50;

// ─────────────────────────────────────────────
// EC企画アラート
// ─────────────────────────────────────────────

function ecAlerts(campaigns: EcCampaign[]): AppAlert[] {
  const todayYm = new Date().toISOString().slice(0, 7);
  const alerts: AppAlert[] = [];

  for (const c of campaigns) {
    // 未来月はスキップ
    if (c.targetMonth > todayYm) continue;

    if (c.actual !== undefined) {
      // 実績あり → 達成率チェック
      const pct = calcPct(c.actual, c.target);
      if (pct === null) continue;
      if (pct < PCT_CRITICAL) {
        alerts.push({
          id:       `ec-critical-${c.id}`,
          level:    "critical",
          category: "ec",
          label:    "EC",
          message:  `${c.name}（${c.type}）達成率 ${pct}%`,
          href:     "/ec/campaigns",
        });
      } else if (pct < PCT_WARN) {
        alerts.push({
          id:       `ec-warn-${c.id}`,
          level:    "warn",
          category: "ec",
          label:    "EC",
          message:  `${c.name}（${c.type}）達成率 ${pct}%`,
          href:     "/ec/campaigns",
        });
      }
    } else if (c.targetMonth < todayYm) {
      // 過去月かつ未入力
      alerts.push({
        id:       `ec-info-${c.id}`,
        level:    "info",
        category: "ec",
        label:    "EC",
        message:  `${c.name}（${c.type}）実績未入力`,
        href:     "/ec/campaigns",
      });
    }
  }

  return alerts;
}

// ─────────────────────────────────────────────
// 大会・イベントアラート
// ─────────────────────────────────────────────

function eventAlerts(events: EventTarget[]): AppAlert[] {
  const today = new Date().toISOString().slice(0, 10);
  const alerts: AppAlert[] = [];

  for (const ev of events) {
    // 未来日程はスキップ
    if (ev.date >= today) continue;

    if (ev.actual !== undefined) {
      // 実績あり → 達成率チェック
      const pct = calcPct(ev.actual, ev.target);
      if (pct === null) continue;
      if (pct < PCT_CRITICAL) {
        alerts.push({
          id:       `event-critical-${ev.id}`,
          level:    "critical",
          category: "event",
          label:    "大会",
          message:  `${ev.name} 売上達成率 ${pct}%`,
          href:     "/events/results",
        });
      } else if (pct < PCT_WARN) {
        alerts.push({
          id:       `event-warn-${ev.id}`,
          level:    "warn",
          category: "event",
          label:    "大会",
          message:  `${ev.name} 売上達成率 ${pct}%`,
          href:     "/events/results",
        });
      }
    } else {
      // 実績未入力
      alerts.push({
        id:       `event-info-${ev.id}`,
        level:    "info",
        category: "event",
        label:    "大会",
        message:  `${ev.name} 実績未入力`,
        href:     "/events",
      });
    }
  }

  return alerts;
}

// ─────────────────────────────────────────────
// 商品アラート（評価ベース）
// ─────────────────────────────────────────────

function goodsAlerts(goodsList: GoodsCalculated[]): AppAlert[] {
  const alerts: AppAlert[] = [];

  for (const g of goodsList) {
    const evaluation = evaluateGoods(g);
    if (evaluation.level === "NG") {
      alerts.push({
        id:       `goods-critical-${g.id}`,
        level:    "critical",
        category: "goods",
        label:    "商品",
        message:  `${g.name}（${evaluation.reasons.join("・")}）`,
        href:     `/goods/${g.id}`,
      });
    } else if (evaluation.level === "WARN") {
      alerts.push({
        id:       `goods-warn-${g.id}`,
        level:    "warn",
        category: "goods",
        label:    "商品",
        message:  `${g.name}（${evaluation.reasons.join("・")}）`,
        href:     `/goods/${g.id}`,
      });
    }
  }

  return alerts;
}

// ─────────────────────────────────────────────
// AI提案アラート（機会損失候補）
// ─────────────────────────────────────────────

function suggestionAlerts(histories: SuggestionHistory[]): AppAlert[] {
  const alerts: AppAlert[] = [];

  for (const h of histories) {
    for (const s of h.suggestions) {
      // 優先度が高く未登録の提案 → 機会損失候補
      if (
        !s.registeredGoodsId &&
        (s.priority === "今すぐ作る" || s.priority === "次月候補")
      ) {
        alerts.push({
          id:       `suggestion-opportunity-${s.id}`,
          level:    "opportunity",
          category: "suggestion",
          label:    "AI提案",
          message:  `${s.name}（${s.priority}・未登録）`,
          href:     `/goods/suggest/history/${h.id}`,
        });
      }
    }
  }

  return alerts;
}

// ─────────────────────────────────────────────
// 公開 API
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Airレジ未連携アラート
// ─────────────────────────────────────────────

function airregiAlerts(goodsList: GoodsCalculated[]): AppAlert[] {
  const alerts: AppAlert[] = [];
  const stocks  = getAllAirregiStocks();
  if (stocks.length === 0) return alerts; // 在庫データ未取込なら出さない

  const stockMap = new Map(stocks.map((s) => [s.productCode, s]));

  for (const g of goodsList) {
    // 発売中・制作中のみ対象
    if (g.status !== "発売中" && g.status !== "制作中") continue;

    if (!g.airregiProductCode) {
      alerts.push({
        id:       `airregi-unlinked-${g.id}`,
        level:    "info",
        category: "goods",
        label:    "Airレジ",
        message:  `${g.name} 商品コード未設定（Airレジ未連携）`,
        href:     `/goods/${g.id}/edit`,
      });
    } else {
      const stock = stockMap.get(g.airregiProductCode);
      if (!stock) continue;
      if (stock.currentStock <= 0) {
        alerts.push({
          id:       `airregi-empty-${g.id}`,
          level:    "critical",
          category: "goods",
          label:    "Airレジ在庫",
          message:  `${g.name} 在庫なし（Airレジ: 0個）`,
          href:     `/goods/${g.id}`,
        });
      } else if (stock.currentStock <= 10) {
        alerts.push({
          id:       `airregi-low-${g.id}`,
          level:    "warn",
          category: "goods",
          label:    "Airレジ在庫",
          message:  `${g.name} 在庫少（Airレジ: ${stock.currentStock}個）`,
          href:     `/goods/${g.id}`,
        });
      }
    }
  }

  return alerts;
}

export interface BuildAlertsInput {
  campaigns:  EcCampaign[];
  events:     EventTarget[];
  goodsList:  GoodsCalculated[];
  histories:  SuggestionHistory[];
}

/**
 * 全カテゴリのアラートを生成して返す。
 * critical → warn → info → opportunity の順にソート済み。
 */
export function buildAlerts(input: BuildAlertsInput): AppAlert[] {
  const all = [
    ...ecAlerts(input.campaigns),
    ...eventAlerts(input.events),
    ...goodsAlerts(input.goodsList),
    ...suggestionAlerts(input.histories),
    ...airregiAlerts(input.goodsList),
  ];

  const order: Record<AppAlert["level"], number> = {
    critical:    0,
    warn:        1,
    info:        2,
    opportunity: 3,
  };

  return all.sort((a, b) => order[a.level] - order[b.level]);
}
