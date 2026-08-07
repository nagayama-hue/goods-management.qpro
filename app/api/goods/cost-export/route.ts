import { NextRequest, NextResponse } from "next/server";
import { getAllGoods, getGoodsById } from "@/lib/store";
import { buildGoodsCostCsv } from "@/lib/goodsCostCsv";
import { csvResponse } from "@/lib/salesCsv";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const goodsId = searchParams.get("goodsId") ?? "";

  if (goodsId) {
    const goods = getGoodsById(goodsId);
    if (!goods) {
      return NextResponse.json({ error: "商品が見つかりません。" }, { status: 404 });
    }
    return csvResponse(buildGoodsCostCsv([goods]), `原価_${goods.name}.csv`);
  }

  const today = new Date().toISOString().slice(0, 10);
  return csvResponse(buildGoodsCostCsv(getAllGoods()), `原価一覧_全商品_${today}.csv`);
}
