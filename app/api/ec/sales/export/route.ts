import { NextRequest } from "next/server";
import { getAllSalesRecords } from "@/lib/salesRecordStore";
import { buildDetailCsv, buildSummaryCsv, csvResponse, sortRecords } from "@/lib/salesCsv";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const month = searchParams.get("month") ?? ""; // YYYY-MM。空なら全期間
  const mode  = searchParams.get("mode") ?? "detail";

  const records = sortRecords(
    getAllSalesRecords().filter(
      (r) => r.channel === "ec" && (!month || r.saleDate.startsWith(month))
    )
  );

  const csv = mode === "summary" ? buildSummaryCsv(records) : buildDetailCsv(records);
  const period = month || "全期間";
  const suffix = mode === "summary" ? "商品別" : "明細";
  return csvResponse(csv, `EC売上_${period}_${suffix}.csv`);
}
