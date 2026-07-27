import { NextResponse } from "next/server";
import type { SalesRecord } from "@/types/salesRecord";

export function csvEscape(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  const str = String(value);
  // ダブルクォートを含む場合はエスケープ、カンマ・改行を含む場合はクォート
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const SALE_TYPE_JA: Record<string, string> = {
  normal: "通常", campaign: "企画", bundle: "セット", discount: "値引き", employee_discount: "社員割",
};

/** 1行=1売上実績の明細CSV（全チャネル共通の列構成） */
export function buildDetailCsv(records: SalesRecord[]): string {
  const headers = [
    "販売日",
    "チャネル",
    "商品名",
    "バリエーション",
    "カラー",
    "サイズ",
    "数量",
    "販売単価",
    "定価",
    "値引き額",
    "原価",
    "売上",
    "粗利",
    "粗利率(%)",
    "販売種別",
    "企画名",
    "EC企画",
    "セットID",
    "大会名",
    "販売場所",
    "メモ",
    "登録日時",
  ];

  const rows = records.map((r) => {
    const margin =
      r.revenue > 0 ? Math.round((r.grossProfit / r.revenue) * 100) : 0;
    const channelJa =
      r.channel === "ec" ? "EC" :
      r.channel === "other" ? "単独" :
      r.channel === "hand" ? "手売り" : "大会";
    return [
      r.saleDate,
      channelJa,
      r.goodsName,
      r.variantLabel ?? "",
      r.color ?? "",
      r.size ?? "",
      r.quantity,
      r.sellingPrice,
      r.listPrice ?? r.sellingPrice,
      r.discountAmount ?? 0,
      r.unitCost,
      r.revenue,
      r.grossProfit,
      margin,
      SALE_TYPE_JA[r.saleType ?? "normal"] ?? "通常",
      r.campaignName ?? "",
      r.ecCampaignName ?? "",
      r.bundleId ?? "",
      r.eventName ?? "",
      r.location,
      r.memo ?? "",
      r.createdAt.slice(0, 19).replace("T", " "),
    ].map(csvEscape).join(",");
  });

  return [headers.map(csvEscape).join(","), ...rows].join("\r\n");
}

/** 商品×カラー×サイズごとに集計した「何がどのくらい売れたか」CSV（売上降順） */
export function buildSummaryCsv(records: SalesRecord[]): string {
  interface Sum {
    goodsName: string;
    color: string;
    size: string;
    quantity: number;
    revenue: number;
    grossProfit: number;
  }
  const sums = new Map<string, Sum>();
  for (const r of records) {
    const key = `${r.goodsId}|${r.color ?? ""}|${r.size ?? ""}`;
    const s = sums.get(key) ?? {
      goodsName: r.goodsName,
      color: r.color ?? "",
      size: r.size ?? "",
      quantity: 0,
      revenue: 0,
      grossProfit: 0,
    };
    s.quantity    += r.quantity;
    s.revenue     += r.revenue;
    s.grossProfit += r.grossProfit;
    sums.set(key, s);
  }

  const list = [...sums.values()].sort((a, b) => b.revenue - a.revenue);
  const totalQuantity    = list.reduce((s, x) => s + x.quantity, 0);
  const totalRevenue     = list.reduce((s, x) => s + x.revenue, 0);
  const totalGrossProfit = list.reduce((s, x) => s + x.grossProfit, 0);

  const headers = [
    "商品名",
    "カラー",
    "サイズ",
    "販売数",
    "売上",
    "粗利",
    "粗利率(%)",
    "売上構成比(%)",
  ];

  const rows = list.map((s) => {
    const margin = s.revenue > 0 ? Math.round((s.grossProfit / s.revenue) * 100) : 0;
    const share  = totalRevenue > 0 ? Math.round((s.revenue / totalRevenue) * 1000) / 10 : 0;
    return [s.goodsName, s.color, s.size, s.quantity, s.revenue, s.grossProfit, margin, share]
      .map(csvEscape).join(",");
  });

  const totalMargin = totalRevenue > 0 ? Math.round((totalGrossProfit / totalRevenue) * 100) : 0;
  const totalRow = ["合計", "", "", totalQuantity, totalRevenue, totalGrossProfit, totalMargin, totalRevenue > 0 ? 100 : 0]
    .map(csvEscape).join(",");

  return [headers.map(csvEscape).join(","), ...rows, totalRow].join("\r\n");
}

/** UTF-8 BOM 付き CSV レスポンス（Excel で文字化けしない） */
export function csvResponse(csv: string, filename: string): NextResponse {
  const bom = "\uFEFF";
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

/** 売上明細の標準ソート（販売日降順→登録日時降順） */
export function sortRecords(records: SalesRecord[]): SalesRecord[] {
  return [...records].sort((a, b) => {
    const d = b.saleDate.localeCompare(a.saleDate);
    return d !== 0 ? d : b.createdAt.localeCompare(a.createdAt);
  });
}
