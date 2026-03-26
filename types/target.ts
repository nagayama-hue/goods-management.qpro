export interface MonthlyTarget {
  year:           number;
  month:          number;  // 1-12
  venueHosted:    number;  // 主催大会（円）
  venueEvent:     number;  // イベント（円）
  ecRegular:      number;  // 通常通販（円）
  ecSeasonal:     number;  // 季節企画（円）
  ecPreorder:     number;  // 受注企画（円）
  ecFc:           number;  // FC連動（円）
  ecAnniversary:  number;  // 周年企画（円）
}

export interface AnnualTargetSummary {
  venueHosted:    number;
  venueEvent:     number;
  venueTotal:     number;
  ecRegular:      number;
  ecSeasonal:     number;
  ecPreorder:     number;
  ecFc:           number;
  ecAnniversary:  number;
  ecTotal:        number;
  grandTotal:     number;
}

/** 月次目標の合計を計算する */
export function calcMonthlyTotals(t: MonthlyTarget) {
  const venueTotal = t.venueHosted + t.venueEvent;
  const ecTotal    = t.ecRegular + t.ecSeasonal + t.ecPreorder + t.ecFc + t.ecAnniversary;
  return { venueTotal, ecTotal, grandTotal: venueTotal + ecTotal };
}
