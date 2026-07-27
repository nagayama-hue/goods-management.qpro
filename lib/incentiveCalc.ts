import { getAllSalesRecords } from "@/lib/salesRecordStore";
import { getAllWrestlers } from "@/lib/wrestlerStore";
import { getAllGoodsIncentives } from "@/lib/goodsIncentiveStore";
import { getAllIncentiveRules } from "@/lib/incentiveRuleStore";
import type { IncentiveRule } from "@/types/incentiveRule";
import type { SalesRecord } from "@/types/salesRecord";

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

const CHANNEL_LABELS: Record<string, string> = { event: "大会", ec: "EC", other: "単独" };

const BASIS_LABELS: Record<string, string> = { sales: "売上額", profit: "粗利" };

/**
 * ルール解決。優先順位:
 * 選手個別 ＞ 全選手デフォルト ／ チャネル個別 ＞ 全チャネル ／
 * 同条件なら startDate が新しいもの（startDate ≦ 売上日）
 */
export function resolveRule(
  rules: IncentiveRule[],
  wrestlerId: string,
  channel: "venue" | "ec" | "hand",
  saleDate: string
): IncentiveRule | null {
  const candidates = rules.filter(
    (r) =>
      (r.wrestlerId === wrestlerId || r.wrestlerId === null) &&
      (r.channel === channel || r.channel === "all") &&
      r.startDate <= saleDate
  );
  candidates.sort((a, b) => {
    const aw = a.wrestlerId ? 1 : 0, bw = b.wrestlerId ? 1 : 0;
    if (aw !== bw) return bw - aw;
    const ac = a.channel !== "all" ? 1 : 0, bc = b.channel !== "all" ? 1 : 0;
    if (ac !== bc) return bc - ac;
    return b.startDate.localeCompare(a.startDate);
  });
  return candidates[0] ?? null;
}

function ruleDescription(rule: IncentiveRule, sharePercent: number): string {
  const base =
    rule.basis === "fixed"
      ? `¥${rule.value.toLocaleString()}/個`
      : `${BASIS_LABELS[rule.basis]} ${rule.value}%`;
  return sharePercent < 100 ? `${base}（按分${sharePercent}%）` : base;
}

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
    // event/other は会場販売として扱う（手売り hand は Phase 4 で追加予定）
    const ruleChannel: "venue" | "ec" = channelRaw === "ec" ? "ec" : "venue";

    const inc = incentives.get(r.goodsId);
    if (!inc) {
      exclude("区分未設定の商品", r);
      continue;
    }
    // 現行制度: 会場・EC の対象は選手個人グッズのみ
    if (inc.category === "multi") {
      exclude("複数選手デザイン商品（現行制度では対象外）", r);
      continue;
    }
    if (inc.category === "org") {
      exclude("団体共通グッズ（対象外）", r);
      continue;
    }

    // 帰属: 売上行の上書き指定があれば紐付けを無視して100%帰属（バリエーション商品用）
    const links = r.wrestlerOverrideId
      ? [{ wrestlerId: r.wrestlerOverrideId, sharePercent: 100 }]
      : inc.links;

    let anyRule = false;
    for (const link of links) {
      const rule = resolveRule(rules, link.wrestlerId, ruleChannel, r.saleDate);
      if (!rule) continue;
      anyRule = true;

      let baseAmount: number;
      let amount: number;
      if (rule.basis === "sales") {
        baseAmount = r.revenue;
        amount = (r.revenue * rule.value) / 100;
      } else if (rule.basis === "profit") {
        baseAmount = r.grossProfit;
        amount = (r.grossProfit * rule.value) / 100;
      } else {
        baseAmount = r.quantity * rule.value;
        amount = baseAmount;
      }
      amount = Math.floor((amount * link.sharePercent) / 100); // 明細行ごとに円未満切り捨て

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
    if (!anyRule) exclude("適用ルールなし", r);
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
