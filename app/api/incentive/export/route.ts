import { NextRequest, NextResponse } from "next/server";
import { calcMonthlyIncentive } from "@/lib/incentiveCalc";
import { csvEscape, csvResponse } from "@/lib/salesCsv";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const month = searchParams.get("month") ?? "";
  const mode = searchParams.get("mode") ?? "detail";

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month（YYYY-MM）を指定してください。" }, { status: 400 });
  }

  const result = calcMonthlyIncentive(month);
  let csv: string;

  if (mode === "summary") {
    // 経理向け: 選手別の振込額一覧
    const headers = ["対象月", "選手", "対象販売数", "対象額", "インセンティブ額"];
    const rows = result.byWrestler.map((w) =>
      [month, w.wrestlerName, w.quantity, w.baseAmount, w.amount].map(csvEscape).join(",")
    );
    const totalRow = [
      month,
      "合計",
      result.byWrestler.reduce((s, w) => s + w.quantity, 0),
      result.byWrestler.reduce((s, w) => s + w.baseAmount, 0),
      result.total,
    ].map(csvEscape).join(",");
    csv = [headers.map(csvEscape).join(","), ...rows, totalRow].join("\r\n");
  } else {
    const headers = [
      "対象月", "選手", "販売日", "チャネル", "商品名", "バリエーション",
      "数量", "対象額", "適用ルール", "インセンティブ額", "メモ", "備考",
    ];
    const rows = result.byWrestler.flatMap((w) =>
      w.lines.map((l) =>
        [
          month,
          w.wrestlerName,
          l.saleDate,
          l.channelLabel,
          l.goodsName,
          l.variantLabel ?? "",
          l.quantity,
          l.baseAmount,
          l.ruleDesc,
          l.amount,
          l.memo ?? "",
          l.costMissing ? "原価未設定（粗利が過大の可能性）" : "",
        ].map(csvEscape).join(",")
      )
    );
    csv = [headers.map(csvEscape).join(","), ...rows].join("\r\n");
  }

  const suffix = mode === "summary" ? "選手別" : "明細";
  return csvResponse(csv, `インセンティブ_${month}_${suffix}.csv`);
}
