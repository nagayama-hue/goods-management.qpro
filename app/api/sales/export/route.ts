import { NextRequest } from "next/server";
import { getAllSalesRecords } from "@/lib/salesRecordStore";
import { buildDetailCsv, buildSummaryCsv, csvResponse, sortRecords } from "@/lib/salesCsv";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const eventFilter = searchParams.get("event") ?? "";
  const goodsFilter = searchParams.get("goods") ?? "";
  const mode        = searchParams.get("mode") ?? "detail";

  let records = sortRecords(getAllSalesRecords());

  if (eventFilter) {
    records = records.filter((r) =>
      (r.eventName ?? r.location).includes(eventFilter)
    );
  }
  if (goodsFilter) {
    records = records.filter((r) => r.goodsName.includes(goodsFilter));
  }

  const csv = mode === "summary" ? buildSummaryCsv(records) : buildDetailCsv(records);

  const today = new Date().toISOString().slice(0, 10);
  const suffix = mode === "summary" ? "-summary" : "";
  return csvResponse(csv, `sales-${today}${suffix}.csv`);
}
