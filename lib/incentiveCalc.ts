import { getAllSalesRecords } from "@/lib/salesRecordStore";
import { getAllWrestlers } from "@/lib/wrestlerStore";
import { getAllGoodsIncentives } from "@/lib/goodsIncentiveStore";
import { getAllIncentiveRules } from "@/lib/incentiveRuleStore";
import {
  resolveRule,
  ruleDescription,
  calcLineAmount,
  calcMultiLineAmount,
  MULTI_TOTAL_SALES_PERCENT,
} from "@/lib/incentiveRuleResolve";
import type { SalesRecord } from "@/types/salesRecord";

export { resolveRule } from "@/lib/incentiveRuleResolve";

/** 明細1行分の計算結果 */
export interface IncentiveLine {
  wrestlerId: string;
  wrestlerName: string;
  saleDate: string;
  goodsName: string;
  variantLabel?: string;
  /** 表示用チャネル: 大会 / EC / 単独 */
  channelLabel: string;
  quantity: number;
  /** 計算のベース額（sales=売上額 / profit=粗利額 / fixed=数量×単価） */
  baseAmount: number;
  /** 適用ルールの説明（例: 売上額 5%） */
  ruleDesc: string;
  /** 行ごと円未満切り捨て後のインセンティブ額 */
  amount: number;
  /** 粗利ベースなのに原価未設定（=粗利が過大の可能性） */
  costMissing: boolean;
}

export interface WrestlerIncentive {
  wrestlerId: string;
  wrestlerName: string;
  quantity: number;
  baseAmount: number;
  amount: number;
  lines: IncentiveLine[];
}

/** 対象外となった売上の区分別サマリ（黙って除外しない） */
export interface ExcludedSummary {
  reason: string;
  count: number;
  quantity: number;
  revenue: number;
}

export interface MonthlyIncentiveResult {
  month: string;
  byWrestler: WrestlerIncentive[];
  excluded: ExcludedSummary[];
  total: number;
  targetLineCount: number;
  costMissingCount: number;
}

const CHANNEL_LABELS: Record<string, string> = { event: "大会", ec: "EC", other: "単独", hand: "手売り" };

/** 対象月（YYYY-MM）の選手別インセンティブを計算する */
export function calcMonthlyIncentive(month: string): MonthlyIncentiveResult {
  const records = getAllSalesRecords().filter((r) => r.saleDate.startsWith(month));
  const wrestlers = getAllWrestlers(); // 退団選手も過去実績の帰属先として含める
  const wrestlerName = (id: string) => wrestlers.find((w) => w.id === id)?.name ?? "（不明）";
  const incentives = new Map(getAllGoodsIncentives().map((x) => [x.goodsId, x]));
  const rules = getAllIncentiveRules();

  const lines: IncentiveLine[] = [];
  const excludedMap = new Map<string, ExcludedSummary>();
  const exclude = (reason: string, r: SalesRecord) => {
    const e = excludedMap.get(reason) ?? { reason, count: 0, quantity: 0, revenue: 0 };
    e.count += 1;
    e.quantity += r.quantity;
    e.revenue += r.revenue;
    excludedMap.set(reason, e);
  };

  for (const r of records) {
    // 社員割は対象外（2026-07-28 運用決定）
    if (r.saleType === "employee_discount") {
      exclude("社員割", r);
      continue;
    }

    const channelRaw = r.channel ?? "event";
    // event/other は会場販売として扱う
    const ruleChannel: "venue" | "ec" | "hand" =
      channelRaw === "ec" ? "ec" : channelRaw === "hand" ? "hand" : "venue";

    // 手売り: 全グッズ対象・帰属は売った選手本人。Lark申請なしは対象外
    if (ruleChannel === "hand") {
      if (!r.handSaleReported) {
        exclude("未申請の手売り（Lark申請なし）", r);
        continue;
      }
      if (!r.wrestlerOverrideId) {
        exclude("手売りの販売者未指定", r);
        continue;
      }
    }

    let links: { wrestlerId: string; sharePercent: number }[];
    let isMulti = false;
    if (r.wrestlerOverrideId) {
      // 売上登録時に帰属選手が明示されている場合は、商品の区分・紐付けを無視して100%帰属
      links = [{ wrestlerId: r.wrestlerOverrideId, sharePercent: 100 }];
    } else {
      const inc = incentives.get(r.goodsId);
      if (!inc) {
        exclude("区分未設定の商品", r);
        continue;
      }
      if (inc.category === "org") {
        exclude("団体共通グッズ（対象外）", r);
        continue;
      }
      // multi（タッグ等）: 合計10%を按分で分ける（2026-07-28 運用決定）
      isMulti = inc.category === "multi";
      links = inc.links;
    }

    let anyRule = false;
    for (const link of links) {
      if (isMulti) {
        // 複数選手商品: ルール解決せず一律「売上額10%×按分」
        anyRule = true;
        lines.push({
          wrestlerId: link.wrestlerId,
          wrestlerName: wrestlerName(link.wrestlerId),
          saleDate: r.saleDate,
          goodsName: r.goodsName,
          variantLabel: r.variantLabel,
          channelLabel: CHANNEL_LABELS[channelRaw] ?? channelRaw,
          quantity: r.quantity,
          baseAmount: r.revenue,
          ruleDesc: `複数選手 ${MULTI_TOTAL_SALES_PERCENT}%を按分（${link.sharePercent}%）`,
          amount: calcMultiLineAmount(r.revenue, link.sharePercent),
          costMissing: false,
        });
        continue;
      }

      const rule = resolveRule(rules, link.wrestlerId, ruleChannel, r.saleDate);
      if (!rule) continue;
      anyRule = true;

      const { baseAmount, amount } = calcLineAmount(
        rule, r.revenue, r.grossProfit, r.quantity, link.sharePercent
      );

      lines.push({
        wrestlerId: link.wrestlerId,
        wrestlerName: wrestlerName(link.wrestlerId),
        saleDate: r.saleDate,
        goodsName: r.goodsName,
        variantLabel: r.variantLabel,
        channelLabel: CHANNEL_LABELS[channelRaw] ?? channelRaw,
        quantity: r.quantity,
        baseAmount,
        ruleDesc: ruleDescription(rule, link.sharePercent),
        amount,
        costMissing: rule.basis === "profit" && r.unitCost === 0,
      });
    }
    if (!anyRule) exclude(isMulti ? "複数選手商品（紐付け選手なし）" : "適用ルールなし", r);
  }

  const byWrestlerMap = new Map<string, WrestlerIncentive>();
  for (const l of lines) {
    const w = byWrestlerMap.get(l.wrestlerId) ?? {
      wrestlerId: l.wrestlerId,
      wrestlerName: l.wrestlerName,
      quantity: 0,
      baseAmount: 0,
      amount: 0,
      lines: [],
    };
    w.quantity += l.quantity;
    w.baseAmount += l.baseAmount;
    w.amount += l.amount;
    w.lines.push(l);
    byWrestlerMap.set(l.wrestlerId, w);
  }

  return {
    month,
    byWrestler: [...byWrestlerMap.values()].sort((a, b) => b.amount - a.amount),
    excluded: [...excludedMap.values()].sort((a, b) => b.count - a.count),
    total: lines.reduce((s, l) => s + l.amount, 0),
    targetLineCount: lines.length,
    costMissingCount: lines.filter((l) => l.costMissing).length,
  };
}
