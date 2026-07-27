"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getGoodsById, saveGoods } from "@/lib/store";
import { addSalesRecord } from "@/lib/salesRecordStore";
import { getWrestlerById } from "@/lib/wrestlerStore";
import { getEventById } from "@/lib/eventStore";
import type { SalesRecord } from "@/types/salesRecord";

export async function recordIncentiveSaleAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const goodsId      = formData.get("goodsId")?.toString() ?? "";
  const variantId    = formData.get("variantId")?.toString() || undefined;
  const wrestlerId   = formData.get("wrestlerId")?.toString() ?? "";
  const channel      = formData.get("channel")?.toString() ?? "";
  const quantity     = Math.max(1, Number(formData.get("quantity") ?? 1));
  const sellingPrice = Number(formData.get("sellingPrice") ?? 0);
  const unitCost     = Number(formData.get("unitCost") ?? 0);
  const saleDate     = formData.get("saleDate")?.toString() ?? new Date().toISOString().slice(0, 10);
  const location     = formData.get("location")?.toString().trim() || "";
  const memo         = formData.get("memo")?.toString().trim() || undefined;
  const eventId      = formData.get("eventId")?.toString() || undefined;
  const handReported = formData.get("handSaleReported") === "on";

  if (!goodsId) return { error: "商品を選択してください。" };
  if (!["event", "hand", "ec"].includes(channel)) return { error: "売れ方を選択してください。" };
  if (sellingPrice <= 0) return { error: "販売単価を入力してください。" };

  const wrestler = getWrestlerById(wrestlerId);
  if (!wrestler) return { error: "選手を選択してください。" };

  const event = eventId ? getEventById(eventId) : undefined;
  if (eventId && !event) return { error: "指定された大会が見つかりません。" };

  const goods = getGoodsById(goodsId);
  if (!goods) return { error: "商品が見つかりません。" };

  // 在庫減算（既存の売上登録と同じ: variant.stockQuantity が唯一の真実）
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
    location: location || (channel === "ec" ? "公式EC" : channel === "hand" ? "手売り" : event?.name ?? "会場"),
    channel: channel as SalesRecord["channel"],
    eventId,
    eventName: event?.name,
    saleType: "normal",
    wrestlerOverrideId: wrestlerId,
    handSaleReported: channel === "hand" ? handReported : undefined,
    memo,
    createdAt: new Date().toISOString(),
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

  revalidatePath("/incentive");
  revalidatePath("/sales");
  revalidatePath(`/goods/${goodsId}`);
  revalidatePath("/");
  if (eventId) revalidatePath(`/events/${eventId}`);
  if (channel === "ec") {
    revalidatePath("/ec");
    revalidatePath("/ec/sales");
  }

  redirect(`/incentive?saved=1&month=${saleDate.slice(0, 7)}`);
}
