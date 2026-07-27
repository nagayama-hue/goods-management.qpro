import { NextRequest, NextResponse } from "next/server";
import { getEventById } from "@/lib/eventStore";
import { getSalesRecordsByEvent } from "@/lib/salesRecordStore";
import { buildDetailCsv, buildSummaryCsv, csvResponse, sortRecords } from "@/lib/salesCsv";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const event = getEventById(id);
  if (!event) {
    return NextResponse.json({ error: "大会が見つかりません。" }, { status: 404 });
  }

  const records = sortRecords(getSalesRecordsByEvent(id));
  const mode = request.nextUrl.searchParams.get("mode") ?? "detail";

  const csv = mode === "summary" ? buildSummaryCsv(records) : buildDetailCsv(records);
  const suffix = mode === "summary" ? "商品別" : "明細";
  return csvResponse(csv, `${event.date}_${event.name}_${suffix}.csv`);
}
