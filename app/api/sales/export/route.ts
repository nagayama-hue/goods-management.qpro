import { NextRequest, NextResponse } from "next/server";
import { getAllSalesRecords } from "@/lib/salesRecordStore";

function escape(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  const str = String(value);
  // ダブルクォートを含む場合はエスケープ、カンマ・改行を含む場合はクォート
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const eventFilter = searchParams.get("event") ?? "";
  const goodsFilter = searchParams.get("goods") ?? "";

  let records = getAllSalesRecords().sort((a, b) => {
    const d = b.saleDate.localeCompare(a.saleDate);
    return d !== 0 ? d : b.createdAt.localeCompare(a.createdAt);
  });

  if (eventFilter) {
    records = records.filter((r) =>
      (r.eventName ?? r.location).includes(eventFilter)
    );
  }
  if (goodsFilter) {
    records = records.filter((r) => r.goodsName.includes(goodsFilter));
  }

  const headers = [
    "販売日",
    "商品名",
    "バリエーション",
    "カラー",
    "サイズ",
    "数量",
    "販売単価",
    "原価",
    "売上",
    "粗利",
    "粗利率(%)",
    "大会名",
    "販売場所",
    "メモ",
    "登録日時",
  ];

  const rows = records.map((r) => {
    const margin =
      r.revenue > 0 ? Math.round((r.grossProfit / r.revenue) * 100) : 0;
    return [
      r.saleDate,
      r.goodsName,
      r.variantLabel ?? "",
      r.color ?? "",
      r.size ?? "",
      r.quantity,
      r.sellingPrice,
      r.unitCost,
      r.revenue,
      r.grossProfit,
      margin,
      r.eventName ?? "",
      r.location,
      r.memo ?? "",
      r.createdAt.slice(0, 19).replace("T", " "),
    ].map(escape).join(",");
  });

  // UTF-8 BOM付き（Excelで文字化けしない）
  const bom = "\uFEFF";
  const csv = bom + [headers.map(escape).join(","), ...rows].join("\r\n");

  const today = new Date().toISOString().slice(0, 10);
  const filename = `sales-${today}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
