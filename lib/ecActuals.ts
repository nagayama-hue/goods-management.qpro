import { getAllSalesRecords } from "@/lib/salesRecordStore";
import type { EcCampaign } from "@/types/ecCampaign";

export interface EcCampaignSalesSum {
  revenue: number;
  quantity: number;
  count: number;
}

/** channel=ec の売上明細を企画IDごとに集計する */
export function getEcSalesSumsByCampaign(): Record<string, EcCampaignSalesSum> {
  const sums: Record<string, EcCampaignSalesSum> = {};
  for (const r of getAllSalesRecords()) {
    if (r.channel !== "ec" || !r.ecCampaignId) continue;
    const s = (sums[r.ecCampaignId] ??= { revenue: 0, quantity: 0, count: 0 });
    s.revenue  += r.revenue;
    s.quantity += r.quantity;
    s.count    += 1;
  }
  return sums;
}

/** 企画に紐付いていない channel=ec の売上を月（YYYY-MM）ごとに集計する */
export function getUnlinkedEcSalesByMonth(): Record<string, EcCampaignSalesSum> {
  const sums: Record<string, EcCampaignSalesSum> = {};
  for (const r of getAllSalesRecords()) {
    if (r.channel !== "ec" || r.ecCampaignId) continue;
    const month = r.saleDate.slice(0, 7);
    const s = (sums[month] ??= { revenue: 0, quantity: 0, count: 0 });
    s.revenue  += r.revenue;
    s.quantity += r.quantity;
    s.count    += 1;
  }
  return sums;
}

/**
 * 企画の実効実績。売上明細が紐付いていればその自動集計を優先し、
 * なければ従来どおり手入力の actual を使う。
 */
export function effectiveActual(
  campaign: EcCampaign,
  salesSums: Record<string, EcCampaignSalesSum>
): number | undefined {
  const sum = salesSums[campaign.id];
  if (sum && sum.count > 0) return sum.revenue;
  return campaign.actual;
}
