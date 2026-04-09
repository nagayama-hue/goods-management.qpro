"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getGoodsById, saveGoods } from "@/lib/store";
import { getEventById } from "@/lib/eventStore";
import { addSalesRecord } from "@/lib/salesRecordStore";
import type { SalesRecord } from "@/types/salesRecord";

export async function recordSaleAction(
  id: string,
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const goods = getGoodsById(id);
  if (!goods) return { error: "商品が見つかりません。" };

  const variantId    = formData.get("variantId")?.toString() || undefined;
  const quantity     = Math.max(1, Number(formData.get("quantity") ?? 1));
  const sellingPrice = Number(formData.get("sellingPrice") ?? 0);
  const unitCost     = Number(formData.get("unitCost") ?? 0);
  const saleDate     = formData.get("saleDate")?.toString() ?? new Date().toISOString().slice(0, 10);
  const location     = formData.get("location")?.toString().trim() ?? "";
  const memo         = formData.get("memo")?.toString().trim() || undefined;
  const eventIdRaw   = formData.get("eventId")?.toString() || undefined;

  if (!location) return { error: "販売場所は必須です。" };
  if (sellingPrice <= 0) return { error: "販売単価を入力してください。" };

  // 大会紐付け
  let eventId: string | undefined;
  let eventName: string | undefined;
  if (eventIdRaw) {
    const event = getEventById(eventIdRaw);
    if (event) { eventId = event.id; eventName = event.name; }
  }

  // バリアント情報を取得
  let variantLabel: string | undefined;
  let color: string | undefined;
  let size: string | undefined;

  const updatedVariants = goods.variants ? [...goods.variants] : undefined;

  if (variantId && updatedVariants) {
    const vIdx = updatedVariants.findIndex((v) => v.id === variantId);
    if (vIdx < 0) return { error: "バリエーションが見つかりません。" };

    const v = updatedVariants[vIdx];
    color = v.color || undefined;
    size = v.size || undefined;
    variantLabel = [v.color, v.size].filter(Boolean).join(" / ") || undefined;

    // 在庫チェック
    if (v.stockQuantity < quantity) {
      return { error: `在庫不足です（在庫: ${v.stockQuantity}個）。` };
    }

    updatedVariants[vIdx] = {
      ...v,
      stockQuantity: v.stockQuantity - quantity,
      soldQuantity: v.soldQuantity + quantity,
    };
  }

  // 売上記録を作成
  const record: SalesRecord = {
    id: `sr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    goodsId: goods.id,
    goodsName: goods.name,
    variantLabel,
    variantId,
    color,
    size,
    sellingPrice,
    unitCost,
    quantity,
    revenue: sellingPrice * quantity,
    grossProfit: (sellingPrice - unitCost) * quantity,
    saleDate,
    location,
    eventId,
    eventName,
    memo,
    createdAt: new Date().toISOString(),
  };

  // 商品の販売数集計を更新
  const updatedSalesCount = updatedVariants
    ? updatedVariants.reduce((s, v) => s + v.soldQuantity, 0)
    : goods.sales.salesCount + quantity;

  const updatedGoods = {
    ...goods,
    variants: updatedVariants,
    sales: {
      ...goods.sales,
      salesCount: updatedSalesCount,
    },
    updatedAt: new Date().toISOString(),
  };

  saveGoods(updatedGoods);
  addSalesRecord(record);
  revalidatePath(`/goods/${id}`);
  revalidatePath("/");
  if (eventId) {
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
  }
  redirect(`/goods/${id}?saved=sale`);
}
