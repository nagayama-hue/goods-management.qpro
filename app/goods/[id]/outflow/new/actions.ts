"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getGoodsById, saveGoods } from "@/lib/store";
import { saveOutflow } from "@/lib/stockOutflowStore";
import type { OutflowType } from "@/types/stockOutflow";

export async function createOutflow(
  id: string,
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const goods = getGoodsById(id);
  if (!goods) return { error: "商品が見つかりません。" };

  const variantId = formData.get("variantId")?.toString() ?? "";
  const quantity  = Number(formData.get("quantity") ?? 0);
  const outflowType = (formData.get("outflowType") as OutflowType) ?? "その他";
  const date = formData.get("date")?.toString() ?? new Date().toISOString().slice(0, 10);
  const memo = formData.get("memo")?.toString() ?? "";

  if (!variantId) return { error: "バリアントを選択してください。" };
  if (!quantity || quantity <= 0) return { error: "数量は1以上を入力してください。" };

  // バリアントを特定
  const variants = goods.variants ?? [];
  const variantIndex = variants.findIndex((v) => v.id === variantId);
  if (variantIndex < 0) return { error: "指定されたバリアントが見つかりません。" };

  const variant = variants[variantIndex];
  if (variant.stockQuantity < quantity) {
    return { error: `在庫が不足しています（現在庫: ${variant.stockQuantity}）。` };
  }

  // 在庫を減算（soldQuantity は変えない）
  const updatedVariants = variants.map((v, i) =>
    i === variantIndex
      ? { ...v, stockQuantity: v.stockQuantity - quantity }
      : v
  );

  const now = new Date().toISOString();
  const updatedGoods = {
    ...goods,
    variants: updatedVariants,
    updatedAt: now,
  };

  saveGoods(updatedGoods);

  saveOutflow({
    id: `outflow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    goodsId: goods.id,
    goodsName: goods.name,
    variantId,
    color: variant.color,
    size: variant.size,
    quantity,
    outflowType,
    date,
    memo,
    createdAt: now,
  });

  revalidatePath("/");
  revalidatePath(`/goods/${id}`);
  redirect(`/goods/${id}?saved=outflow`);
}
