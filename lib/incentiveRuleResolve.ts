import type { IncentiveRule } from "@/types/incentiveRule";

/**
 * ルール解決（純粋関数。クライアントのプレビュー計算でも使うため fs 依存なし）
 * 優先順位:
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

export const BASIS_LABELS: Record<string, string> = { sales: "売上額", profit: "粗利" };

export function ruleDescription(rule: IncentiveRule, sharePercent: number): string {
  const base =
    rule.basis === "fixed"
      ? `¥${rule.value.toLocaleString()}/個`
      : `${BASIS_LABELS[rule.basis]} ${rule.value}%`;
  return sharePercent < 100 ? `${base}（按分${sharePercent}%）` : base;
}

/** 1明細行分のインセンティブ額（行ごと円未満切り捨て） */
export function calcLineAmount(
  rule: IncentiveRule,
  revenue: number,
  grossProfit: number,
  quantity: number,
  sharePercent: number
): { baseAmount: number; amount: number } {
  let baseAmount: number;
  let amount: number;
  if (rule.basis === "sales") {
    baseAmount = revenue;
    amount = (revenue * rule.value) / 100;
  } else if (rule.basis === "profit") {
    baseAmount = grossProfit;
    amount = (grossProfit * rule.value) / 100;
  } else {
    baseAmount = quantity * rule.value;
    amount = baseAmount;
  }
  return { baseAmount, amount: Math.floor((amount * sharePercent) / 100) };
}
