import { NextRequest, NextResponse } from "next/server";
import { getStocktakeById } from "@/lib/stocktakeStore";
import { csvEscape, csvResponse } from "@/lib/salesCsv";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id") ?? "";
  const mode = searchParams.get("mode") ?? "all";

  const stocktake = getStocktakeById(id);
  if (!stocktake) {
    return NextResponse.json({ error: "棚卸しが見つかりません。" }, { status: 404 });
  }

  const headers = [
    "実施日", "担当者", "商品名", "カラー", "サイズ",
    "システム在庫", "実数", "差異", "差異の理由", "メモ",
  ];

  const lines = stocktake.lines.filter((l) => {
    if (mode !== "diff") return true;
    return l.actual !== undefined && l.actual - l.theoretical !== 0;
  });

  const rows = lines.map((l) => {
    const entered = l.actual !== undefined;
    const diff = entered ? (l.actual as number) - l.theoretical : "";
    return [
      stocktake.date,
      stocktake.staff,
      l.goodsName,
      l.color,
      l.size,
      l.theoretical,
      entered ? l.actual : "未入力",
      diff,
      l.reason ?? "",
      l.memo ?? "",
    ].map(csvEscape).join(",");
  });

  const csv = [headers.map(csvEscape).join(","), ...rows].join("\r\n");
  const suffix = mode === "diff" ? "差異" : "全件";
  return csvResponse(csv, `棚卸し_${stocktake.date}_${suffix}.csv`);
}
