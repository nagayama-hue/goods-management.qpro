"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAllGoods } from "@/lib/store";
import { getDraftStocktake, saveStocktake, deleteStocktake } from "@/lib/stocktakeStore";
import type { Stocktake, StocktakeLine } from "@/types/stocktake";

/** 棚卸しを開始する。対象商品×バリエーションから入力行を生成 */
export async function startStocktakeAction(formData: FormData): Promise<void> {
  const staff = formData.get("staff")?.toString().trim() ?? "";
  const date = formData.get("date")?.toString() ?? new Date().toISOString().slice(0, 10);
  const scope = formData.get("scope")?.toString() ?? "active";

  if (!staff) redirect("/stocktake?error=staff");
  if (getDraftStocktake()) redirect("/stocktake?error=draft");

  // 案出し中・検討中は在庫を持たないため既定では対象外
  const goodsList = getAllGoods().filter(
    (g) => scope === "all" || !["案出し中", "検討中"].includes(g.status)
  );

  const lines: StocktakeLine[] = [];
  for (const g of goodsList) {
    for (const v of g.variants ?? []) {
      lines.push({
        goodsId: g.id,
        goodsName: g.name,
        variantId: v.id,
        color: v.color,
        size: v.size,
        theoretical: v.stockQuantity,
      });
    }
  }

  if (lines.length === 0) redirect("/stocktake?error=empty");

  const now = new Date().toISOString();
  const stocktake: Stocktake = {
    id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date,
    staff,
    status: "draft",
    lines,
    createdAt: now,
    updatedAt: now,
  };
  saveStocktake(stocktake);

  revalidatePath("/stocktake");
  redirect(`/stocktake/${stocktake.id}`);
}

/** 下書きの棚卸しを破棄する（確定済みは削除しない） */
export async function discardStocktakeAction(formData: FormData): Promise<void> {
  const id = formData.get("id")?.toString() ?? "";
  const draft = getDraftStocktake();
  if (id && draft?.id === id) deleteStocktake(id);
  revalidatePath("/stocktake");
  redirect("/stocktake");
}
