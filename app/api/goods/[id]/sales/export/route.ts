import { NextRequest, NextResponse } from "next/server";
import { getGoodsById } from "@/lib/store";
import { getSalesRecordsByGoods } from "@/lib/salesRecordStore";
import { buildDetailCsv, buildSummaryCsv, csvResponse, sortRecords } from "@/lib/salesCsv";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const goods = getGoodsById(id);
  if (!goods) {
    return NextResponse.json({ error: "商品が見つかりません。" }, { status: 404 });
  }

  const records = sortRecords(getSalesRecordsByGoods(id));
  const mode = request.nextUrl.searchParams.get("mode") ?? "detail";

  const csv = mode === "summary" ? buildSummaryCsv(records) : buildDetailCsv(records);
  const suffix = mode === "summary" ? "バリエーション別" : "明細";
  return csvResponse(csv, `売上_${goods.name}_${suffix}.csv`);
}
