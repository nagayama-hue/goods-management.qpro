import { getAllSalesRecords } from "@/lib/salesRecordStore";
import { getAllEvents } from "@/lib/eventStore";
import { getAllGoods } from "@/lib/store";
import { getAllCampaigns } from "@/lib/ecCampaignStore";
import { getAllStocktakes } from "@/lib/stocktakeStore";
import { unitManufacturingCost } from "@/lib/aggregations";
import type { SalesRecord } from "@/types/salesRecord";

/**
 * 社内ポータル向けの集計（GET /api/portal/summary）。docs/portal-integration.md 段階2。
 *
 * 守ること:
 * - 原価単価・取引先・メモ・担当者など個人や社外秘の明細は返さない（集計値のみ）
 * - 金額は税込のまま返す（税抜換算はポータル側）
 * - 売上は SalesRecord の saleDate で期間を絞る。channel 未設定は event 扱い
 */

type Channel = "event" | "ec" | "other" | "hand";

interface Amounts {
  revenue:     number;
  grossProfit: number;
  quantity:    number;
}

const zero = (): Amounts => ({ revenue: 0, grossProfit: 0, quantity: 0 });

function add(a: Amounts, r: SalesRecord): void {
  a.revenue     += r.revenue;
  a.grossProfit += r.grossProfit;
  a.quantity    += r.quantity;
}

/** 日本時間の ISO 文字列（例 2026-12-05T10:00:00+09:00） */
function nowJst(): string {
  return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 19) + "+09:00";
}

/** 商品別に集計して売上の大きい順に並べる */
function topItemsOf(records: SalesRecord[], goodsNames: Map<string, string>, limit: number) {
  const map = new Map<string, Amounts>();
  for (const r of records) {
    const a = map.get(r.goodsId) ?? zero();
    add(a, r);
    map.set(r.goodsId, a);
  }
  const fallbackName = new Map(records.map((r) => [r.goodsId, r.goodsName]));
  return [...map.entries()]
    .map(([goodsId, a]) => ({
      goodsId,
      name: goodsNames.get(goodsId) ?? fallbackName.get(goodsId) ?? "",
      ...a,
    }))
    .sort((x, y) => y.revenue - x.revenue || y.quantity - x.quantity)
    .slice(0, limit);
}

export function buildPortalSummary(from: string, to: string) {
  const inPeriod = (date: string) => date >= from && date <= to;

  const records = getAllSalesRecords().filter((r) => inPeriod(r.saleDate));
  const goods   = getAllGoods(); // バリエーション未設定の商品も「標準/FREE」で在庫を持つ
  const goodsNames = new Map(goods.map((g) => [g.id, g.name]));

  // ── 合計・チャネル別 ─────────────────────────────
  const totals = zero();
  const channelMap = new Map<Channel, Amounts>();
  for (const r of records) {
    add(totals, r);
    const ch: Channel = r.channel ?? "event";
    const a = channelMap.get(ch) ?? zero();
    add(a, r);
    channelMap.set(ch, a);
  }
  const byChannel = [...channelMap.entries()]
    .map(([channel, a]) => ({ channel, ...a }))
    .sort((x, y) => y.revenue - x.revenue);

  // ── 大会別（大会IDの付いた売上。手売りも含む＝大会詳細画面と同じ範囲） ──
  const events = getAllEvents();
  const eventById = new Map(events.map((e) => [e.id, e]));
  const recordsByEvent = new Map<string, SalesRecord[]>();
  const unlinked = { ...zero(), count: 0 };
  for (const r of records) {
    if (r.eventId) {
      const list = recordsByEvent.get(r.eventId) ?? [];
      list.push(r);
      recordsByEvent.set(r.eventId, list);
    } else if ((r.channel ?? "event") === "event") {
      // 大会チャネルなのに大会に紐づいていない売上（照合用に件数と金額だけ返す）
      add(unlinked, r);
      unlinked.count += 1;
    }
  }
  // 期間内に開催された大会（売上ゼロでも目標と並べて見せる）＋ 期間内に売上がある大会
  const eventIds = new Set<string>([
    ...events.filter((e) => inPeriod(e.date)).map((e) => e.id),
    ...recordsByEvent.keys(),
  ]);
  const byEvent = [...eventIds]
    .map((id) => {
      const ev   = eventById.get(id);
      const list = recordsByEvent.get(id) ?? [];
      const a = zero();
      list.forEach((r) => add(a, r));
      return {
        goodsEventId:  id,
        portalEventId: ev?.portalEventId ?? null,
        date:          ev?.date ?? list[0]?.saleDate ?? "",
        name:          ev?.name ?? list[0]?.eventName ?? list[0]?.location ?? "",
        type:          ev?.type ?? null,
        target:        ev?.target ?? null,
        ...a,
        topItems:      topItemsOf(list, goodsNames, 5),
      };
    })
    .sort((x, y) => x.date.localeCompare(y.date) || x.name.localeCompare(y.name));

  // ── 全体の売れ筋 ───────────────────────────────
  const topItems = topItemsOf(records, goodsNames, 10).map(({ goodsId, name, quantity, revenue }) => ({
    goodsId, name, quantity, revenue,
  }));

  // ── 在庫（現時点。バリエーションの在庫数が正） ───────────────
  const categoryMap = new Map<string, { quantity: number; costValue: number }>();
  const negativeItems: { goodsId: string; name: string; variant: string; quantity: number }[] = [];
  let stockCostValue = 0;
  for (const g of goods) {
    const fallbackCost = unitManufacturingCost(g);
    for (const v of g.variants ?? []) {
      if (v.stockQuantity < 0) {
        negativeItems.push({
          goodsId:  g.id,
          name:     g.name,
          variant:  [v.color, v.size].filter(Boolean).join(" / "),
          quantity: v.stockQuantity,
        });
        continue; // マイナス在庫は金額・数量に入れない（データ不整合として別に返す）
      }
      if (v.stockQuantity === 0) continue;
      // 原価はバリエーション別の原価があればそれ、なければ製造原価÷製作数
      const unitCost = v.unitCost && v.unitCost > 0 ? v.unitCost : fallbackCost;
      const value = v.stockQuantity * unitCost;
      stockCostValue += value;
      const c = categoryMap.get(g.category) ?? { quantity: 0, costValue: 0 };
      c.quantity  += v.stockQuantity;
      c.costValue += value;
      categoryMap.set(g.category, c);
    }
  }
  const lastStocktake = getAllStocktakes()
    .filter((s) => s.status === "confirmed")
    .map((s) => s.date)
    .sort()
    .at(-1) ?? null;

  // ── EC ───────────────────────────────────────
  const campaignNames = new Map(getAllCampaigns().map((c) => [c.id, c.name]));
  const ecRecords = records.filter((r) => r.channel === "ec");
  const ecByCampaign = new Map<string, number>();
  for (const r of ecRecords) {
    if (!r.ecCampaignId) continue;
    ecByCampaign.set(r.ecCampaignId, (ecByCampaign.get(r.ecCampaignId) ?? 0) + r.revenue);
  }

  return {
    generatedAt: nowJst(),
    period:      { from, to },
    currency:    "JPY",
    taxIncluded: true,
    totals,
    byChannel,
    byEvent,
    unlinkedEventSales: unlinked,
    topItems,
    stock: {
      costValue: Math.round(stockCostValue),
      byCategory: [...categoryMap.entries()]
        .map(([category, c]) => ({ category, quantity: c.quantity, costValue: Math.round(c.costValue) }))
        .sort((x, y) => y.costValue - x.costValue),
      lastStocktakeDate: lastStocktake,
      negativeItems: { count: negativeItems.length, items: negativeItems },
    },
    ec: {
      revenue: ecRecords.reduce((s, r) => s + r.revenue, 0),
      campaigns: [...ecByCampaign.entries()]
        .map(([id, revenue]) => ({
          id,
          name: campaignNames.get(id) ?? ecRecords.find((r) => r.ecCampaignId === id)?.ecCampaignName ?? "",
          revenue,
        }))
        .sort((x, y) => y.revenue - x.revenue),
    },
  };
}
