"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getGoodsById, saveGoods } from "@/lib/store";
import { addSalesRecord } from "@/lib/salesRecordStore";
import { parseSaleTypeFields } from "@/lib/saleTypeUtils";
import type { SalesRecord } from "@/types/salesRecord";

export async function recordEcSaleAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const goodsId      = formData.get("goodsId")?.toString() ?? "";
  const variantId    = formData.get("variantId")?.toString() || undefined;
  const quantity     = Math.max(1, Number(formData.get("quantity") ?? 1));
  const sellingPrice = Number(formData.get("sellingPrice") ?? 0);
  const unitCost     = Number(formData.get("unitCost") ?? 0);
  const saleDate     = formData.get("saleDate")?.toString() ?? new Date().toISOString().slice(0, 10);
  const location     = formData.get("location")?.toString().trim() || "公式EC";
  const memo         = formData.get("memo")?.toString().trim() || undefined;

  if (!goodsId) return { error: "商品を選択してください。" };
  if (sellingPrice <= 0) return { error: "販売単価を入力してください。" };

  const saleTypeFields = parseSaleTypeFields(formData, sellingPrice);

  const goods = getGoodsById(goodsId);
  if (!goods) return { error: "商品が見つかりません。" };

  let variantLabel: string | undefined;
  let color: string | undefined;
  let size: string | undefined;
  const updatedVariants = goods.variants ? [...goods.variants] : undefined;

  if (variantId && updatedVariants) {
    const vIdx = updatedVariants.findIndex((v) => v.id === variantId);
    if (vIdx < 0) return { error: "バリエーションが見つかりません。" };
    const v = updatedVariants[vIdx];
    color = v.color || undefined;
    size  = v.size  || undefined;
    variantLabel = [v.color, v.size].filter(Boolean).join(" / ") || undefined;
    if (v.stockQuantity < quantity) {
      return { error: `在庫不足です（在庫: ${v.stockQuantity}個）。` };
    }
    updatedVariants[vIdx] = {
      ...v,
      stockQuantity: v.stockQuantity - quantity,
      soldQuantity:  v.soldQuantity  + quantity,
    };
  }

  const record: SalesRecord = {
    id:          `sr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    goodsId:     goods.id,
    goodsName:   goods.name,
    variantLabel,
    variantId,
    color,
    size,
    sellingPrice,
    unitCost,
    quantity,
    revenue:     sellingPrice * quantity,
    grossProfit: (sellingPrice - unitCost) * quantity,
    saleDate,
    location,
    channel:       "ec",
    saleType:      saleTypeFields.saleType,
    listPrice:     saleTypeFields.listPrice,
    discountAmount: saleTypeFields.discountAmount || undefined,
    campaignName:  saleTypeFields.campaignName,
    bundleId:      saleTypeFields.bundleId,
    memo,
    createdAt:   new Date().toISOString(),
  };

  const updatedSalesCount = updatedVariants
    ? updatedVariants.reduce((s, v) => s + v.soldQuantity, 0)
    : goods.sales.salesCount + quantity;

  saveGoods({
    ...goods,
    variants: updatedVariants,
    sales: { ...goods.sales, salesCount: updatedSalesCount },
    updatedAt: new Date().toISOString(),
  });
  addSalesRecord(record);

  revalidatePath("/ec/sales");
  revalidatePath("/sales");
  revalidatePath(`/goods/${goodsId}`);
  revalidatePath("/");

  if (saleTypeFields.saleType === "bundle" && saleTypeFields.bundleId) {
    redirect(`/ec/sales/new?bundleId=${encodeURIComponent(saleTypeFields.bundleId)}&saved=bundle`);
  }
  redirect("/ec/sales?saved=1");
}
