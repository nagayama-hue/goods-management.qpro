export type EcCampaignType = "通常販売" | "季節企画" | "受注企画" | "FC連動限定企画" | "周年企画";

export const EC_CAMPAIGN_TYPES: EcCampaignType[] = [
  "通常販売",
  "季節企画",
  "受注企画",
  "FC連動限定企画",
  "周年企画",
];

export const EC_CAMPAIGN_TYPE_STYLES: Record<EcCampaignType, string> = {
  通常販売:       "bg-gray-100 text-gray-600",
  季節企画:       "bg-orange-100 text-orange-700",
  受注企画:       "bg-blue-100 text-blue-700",
  FC連動限定企画: "bg-purple-100 text-purple-700",
  周年企画:       "bg-red-100 text-red-700",
};

export interface EcCampaign {
  id:          string;
  type:        EcCampaignType;
  name:        string;
  targetMonth: string;   // YYYY-MM
  target:      number;   // 売上目標（円）
  actual?:     number;   // 実績（円）大会後に入力
  memo?:       string;
  createdAt:   string;
}
