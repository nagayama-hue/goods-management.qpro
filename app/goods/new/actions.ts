"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saveGoods } from "@/lib/store";
import type { Goods, GoodsCategory, GoodsStatus, SalesChannel, Priority } from "@/types/goods";

export async function createGoods(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const name = formData.get("name")?.toString().trim() ?? "";
  if (!name) return { error: "商品名は必須です。" };

  const now = new Date().toISOString();
  const goods: Goods = {
    id: `goods-${Date.now()}`,
    name,
    category: (formData.get("category") as GoodsCategory) ?? "その他",
    concept: formData.get("concept")?.toString() ?? "",
    target: formData.get("target")?.toString() ?? "",
    salesChannel: (formData.get("salesChannel") as SalesChannel) ?? "会場",
    status: (formData.get("status") as GoodsStatus) ?? "案出し中",
    priority: (formData.get("priority") as Priority) ?? "中",
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
    createdAt: now,
    updatedAt: now,
  };

  saveGoods(goods);
  revalidatePath("/");
  redirect(`/goods/${goods.id}?saved=created`);
}
