"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSalesRecordById, deleteSalesRecord } from "@/lib/salesRecordStore";
import { getGoodsById, saveGoods } from "@/lib/store";
import { restoreVariantStock } from "@/lib/variantUtils";

export async function deleteSaleAction(
  recordId: string,
  returnTo: string
): Promise<void> {
  const record = getSalesRecordById(recordId);
  const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/sales";
  if (!record) redirect(safeReturnTo);

  const goods = getGoodsById(record.goodsId);
  if (goods) {
    const variants = goods.variants ? [...goods.variants] : undefined;

    if (record.variantId && variants) {
      const vIdx = variants.findIndex((v) => v.id === record.variantId);
      if (vIdx >= 0) variants[vIdx] = restoreVariantStock(variants[vIdx], record.quantity);
    }

    const salesCount = variants
      ? variants.reduce((s, v) => s + v.soldQuantity, 0)
      : Math.max(0, goods.sales.salesCount - record.quantity);

    saveGoods({ ...goods, variants, sales: { ...goods.sales, salesCount }, updatedAt: new Date().toISOString() });
  }

  deleteSalesRecord(recordId);

  revalidatePath("/sales");
  revalidatePath(`/goods/${record.goodsId}`);
  if (record.eventId) revalidatePath(`/events/${record.eventId}`);

  redirect(safeReturnTo);
}
