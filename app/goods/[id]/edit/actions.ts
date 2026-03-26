"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getGoodsById, saveGoods } from "@/lib/store";
import type { GoodsCategory, GoodsStatus, SalesChannel, Priority, GoodsVariant } from "@/types/goods";

export async function updateGoods(
  id: string,
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const goods = getGoodsById(id);
  if (!goods) return { error: "商品が見つかりません。" };

  const name = formData.get("name")?.toString().trim() ?? "";
  if (!name) return { error: "商品名は必須です。" };

  // バリエーション（JSON）
  let variants: GoodsVariant[] = [];
  try {
    const raw = formData.get("variants")?.toString() ?? "[]";
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) variants = parsed;
  } catch { /* ignore */ }

  const updated = {
    ...goods,
    name,
    category: (formData.get("category") as GoodsCategory) ?? goods.category,
    concept: formData.get("concept")?.toString() ?? "",
    target: formData.get("target")?.toString() ?? "",
    salesChannel: (formData.get("salesChannel") as SalesChannel) ?? goods.salesChannel,
    status: (formData.get("status") as GoodsStatus) ?? goods.status,
    priority: (formData.get("priority") as Priority) ?? goods.priority,
    releaseDate: formData.get("releaseDate")?.toString() || undefined,
    memo: formData.get("memo")?.toString() ?? "",
    budget: {
      budgetAmount: Number(formData.get("budgetAmount") ?? 0),
      designCost: Number(formData.get("designCost") ?? 0),
      sampleCost: Number(formData.get("sampleCost") ?? 0),
      manufacturingCost: Number(formData.get("manufacturingCost") ?? 0),
      shippingCost: Number(formData.get("shippingCost") ?? 0),
      otherCost: Number(formData.get("otherCost") ?? 0),
    },
    sales: {
      sellingPrice: Number(formData.get("sellingPrice") ?? 0),
      productionCount: Number(formData.get("productionCount") ?? 0),
      salesCount: Number(formData.get("salesCount") ?? 0),
    },
    variants: variants.length > 0 ? variants : undefined,
    airregiProductCode: formData.get("airregiProductCode")?.toString().trim() || undefined,
    updatedAt: new Date().toISOString(),
  };

  saveGoods(updated);
  revalidatePath("/");
  revalidatePath(`/goods/${id}`);
  redirect(`/goods/${id}?saved=updated`);
}
