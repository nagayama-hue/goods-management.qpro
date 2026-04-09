"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSalesRecordById, updateSalesRecord } from "@/lib/salesRecordStore";
import { getGoodsById, saveGoods } from "@/lib/store";
import { restoreVariantStock, applyVariantSale } from "@/lib/variantUtils";
import type { SalesRecord } from "@/types/salesRecord";
import type { GoodsVariant } from "@/types/goods";

export async function updateSaleAction(
  recordId: string,
  returnTo: string,
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const oldRecord = getSalesRecordById(recordId);
  if (!oldRecord) return { error: "売上実績が見つかりません。" };

  const newGoodsId   = formData.get("goodsId")?.toString() ?? oldRecord.goodsId;
  const newVariantId = formData.get("variantId")?.toString() || undefined;
  const newQty       = Math.max(1, Number(formData.get("quantity") ?? 1));
  const newPrice     = Number(formData.get("sellingPrice") ?? 0);
  const newCost      = Number(formData.get("unitCost") ?? 0);
  const newDate      = formData.get("saleDate")?.toString() ?? oldRecord.saleDate;
  const newLocation  = formData.get("location")?.toString().trim() ?? "";
  const newMemo      = formData.get("memo")?.toString().trim() || undefined;

  if (!newLocation)  return { error: "販売場所は必須です。" };
  if (newPrice <= 0) return { error: "販売単価を入力してください。" };

  const isSameGoods   = newGoodsId === oldRecord.goodsId;
  const isSameVariant = newVariantId === oldRecord.variantId;

  let resolvedVariant: GoodsVariant | undefined = undefined;
  let resolvedGoodsName: string = oldRecord.goodsName;

  if (isSameGoods) {
    const goods = getGoodsById(newGoodsId);
    if (!goods) return { error: "商品が見つかりません。" };
    resolvedGoodsName = goods.name;

    const variants = goods.variants ? [...goods.variants] : undefined;

    if (variants) {
      if (isSameVariant && newVariantId) {
        const vIdx = variants.findIndex((v) => v.id === newVariantId);
        if (vIdx < 0) return { error: "バリエーションが見つかりません。" };
        const diff = newQty - oldRecord.quantity;
        const newStock = variants[vIdx].stockQuantity - diff;
        const effectiveMax = variants[vIdx].stockQuantity + oldRecord.quantity;
        if (newStock < 0) return { error: `在庫不足です（変更可能な最大数量: ${effectiveMax}個）。` };
        variants[vIdx] = { ...variants[vIdx], stockQuantity: newStock, soldQuantity: variants[vIdx].soldQuantity + diff };
      } else {
        // 旧バリアントを戻し、新バリアントに適用
        if (oldRecord.variantId) {
          const oldVIdx = variants.findIndex((v) => v.id === oldRecord.variantId);
          if (oldVIdx >= 0) variants[oldVIdx] = restoreVariantStock(variants[oldVIdx], oldRecord.quantity);
        }
        if (newVariantId) {
          const newVIdx = variants.findIndex((v) => v.id === newVariantId);
          if (newVIdx < 0) return { error: "変更先のバリエーションが見つかりません。" };
          if (variants[newVIdx].stockQuantity < newQty) {
            return { error: `在庫不足です（変更先の在庫: ${variants[newVIdx].stockQuantity}個）。` };
          }
          variants[newVIdx] = applyVariantSale(variants[newVIdx], newQty);
        }
      }
      resolvedVariant = variants.find((v) => v.id === newVariantId);
    }

    const salesCount = variants
      ? variants.reduce((s, v) => s + v.soldQuantity, 0)
      : Math.max(0, goods.sales.salesCount + (newQty - oldRecord.quantity));
    saveGoods({ ...goods, variants, sales: { ...goods.sales, salesCount }, updatedAt: new Date().toISOString() });

  } else {
    // 旧商品を戻す
    const oldGoods = getGoodsById(oldRecord.goodsId);
    if (oldGoods) {
      const oldVariants = oldGoods.variants ? [...oldGoods.variants] : undefined;
      if (oldRecord.variantId && oldVariants) {
        const vIdx = oldVariants.findIndex((v) => v.id === oldRecord.variantId);
        if (vIdx >= 0) oldVariants[vIdx] = restoreVariantStock(oldVariants[vIdx], oldRecord.quantity);
      }
      const oldSalesCount = oldVariants
        ? oldVariants.reduce((s, v) => s + v.soldQuantity, 0)
        : Math.max(0, oldGoods.sales.salesCount - oldRecord.quantity);
      saveGoods({ ...oldGoods, variants: oldVariants, sales: { ...oldGoods.sales, salesCount: oldSalesCount }, updatedAt: new Date().toISOString() });
    }

    // 新商品に適用
    const newGoods = getGoodsById(newGoodsId);
    if (!newGoods) return { error: "変更先の商品が見つかりません。" };
    resolvedGoodsName = newGoods.name;

    const newVariants = newGoods.variants ? [...newGoods.variants] : undefined;
    if (newVariantId && newVariants) {
      const vIdx = newVariants.findIndex((v) => v.id === newVariantId);
      if (vIdx < 0) return { error: "変更先のバリエーションが見つかりません。" };
      if (newVariants[vIdx].stockQuantity < newQty) {
        return { error: `在庫不足です（変更先の在庫: ${newVariants[vIdx].stockQuantity}個）。` };
      }
      newVariants[vIdx] = applyVariantSale(newVariants[vIdx], newQty);
      resolvedVariant = newVariants.find((v) => v.id === newVariantId);
    }

    const newSalesCount = newVariants
      ? newVariants.reduce((s, v) => s + v.soldQuantity, 0)
      : newGoods.sales.salesCount + newQty;
    saveGoods({ ...newGoods, variants: newVariants, sales: { ...newGoods.sales, salesCount: newSalesCount }, updatedAt: new Date().toISOString() });
  }

  const variantLabel = resolvedVariant
    ? [resolvedVariant.color, resolvedVariant.size].filter(Boolean).join(" / ") || undefined
    : undefined;

  const updatedRecord: SalesRecord = {
    ...oldRecord,
    goodsId:      newGoodsId,
    goodsName:    resolvedGoodsName,
    variantId:    newVariantId,
    variantLabel,
    color:        resolvedVariant?.color || undefined,
    size:         resolvedVariant?.size  || undefined,
    sellingPrice: newPrice,
    unitCost:     newCost,
    quantity:     newQty,
    revenue:      newPrice * newQty,
    grossProfit:  (newPrice - newCost) * newQty,
    saleDate:     newDate,
    location:     newLocation,
    memo:         newMemo,
  };

  updateSalesRecord(updatedRecord);

  revalidatePath("/sales");
  revalidatePath(`/goods/${oldRecord.goodsId}`);
  if (newGoodsId !== oldRecord.goodsId) revalidatePath(`/goods/${newGoodsId}`);
  if (oldRecord.eventId) revalidatePath(`/events/${oldRecord.eventId}`);

  redirect(returnTo.startsWith("/") ? returnTo : "/sales");
}
