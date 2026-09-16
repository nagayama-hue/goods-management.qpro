"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getGoodsById, saveGoods } from "@/lib/store";
import { getStocktakeById, saveStocktake } from "@/lib/stocktakeStore";
import type { StocktakeLine } from "@/types/stocktake";

/** 画面から送られる入力値（行の識別子＋実数・理由・メモ） */
export interface StocktakeInput {
  goodsId: string;
  variantId: string;
  actual?: number;
  reason?: string;
  memo?: string;
}

function mergeLines(lines: StocktakeLine[], inputs: StocktakeInput[]): StocktakeLine[] {
  const map = new Map(inputs.map((i) => [`${i.goodsId}|${i.variantId}`, i]));
  return lines.map((l) => {
    const input = map.get(`${l.goodsId}|${l.variantId}`);
    if (!input) return l;
    return {
      ...l,
      actual: input.actual,
      reason: input.reason ? (input.reason as StocktakeLine["reason"]) : undefined,
      memo: input.memo || undefined,
    };
  });
}

/** 入力途中の内容を下書き保存する（在庫は変更しない） */
export async function saveDraftAction(
  stocktakeId: string,
  inputs: StocktakeInput[]
): Promise<{ ok: boolean; error?: string; savedAt?: string }> {
  const stocktake = getStocktakeById(stocktakeId);
  if (!stocktake) return { ok: false, error: "棚卸しが見つかりません。" };
  if (stocktake.status === "confirmed") return { ok: false, error: "確定済みの棚卸しは編集できません。" };

  const now = new Date().toISOString();
  saveStocktake({ ...stocktake, lines: mergeLines(stocktake.lines, inputs), updatedAt: now });
  revalidatePath(`/stocktake/${stocktakeId}`);
  return { ok: true, savedAt: now };
}

/**
 * 棚卸しを確定し、実数を在庫に反映する。
 * 在庫（stockQuantity）のみ更新し、販売数（soldQuantity）は変更しない。
 * 未入力の行は在庫を変更せずスキップする。
 */
export async function confirmStocktakeAction(
  stocktakeId: string,
  inputs: StocktakeInput[]
): Promise<{ ok: boolean; error?: string }> {
  const stocktake = getStocktakeById(stocktakeId);
  if (!stocktake) return { ok: false, error: "棚卸しが見つかりません。" };
  if (stocktake.status === "confirmed") return { ok: false, error: "すでに確定済みです。" };

  const merged = mergeLines(stocktake.lines, inputs);

  // 商品ごとにまとめて在庫を更新
  const byGoods = new Map<string, StocktakeLine[]>();
  for (const l of merged) {
    if (l.actual === undefined) continue;
    const list = byGoods.get(l.goodsId) ?? [];
    list.push(l);
    byGoods.set(l.goodsId, list);
  }

  const now = new Date().toISOString();
  const confirmedLines = [...merged];

  for (const [goodsId, lines] of byGoods) {
    const goods = getGoodsById(goodsId);
    if (!goods) continue;
    const variants = [...(goods.variants ?? [])];
    let changed = false;

    for (const l of lines) {
      const idx = variants.findIndex((v) => v.id === l.variantId);
      if (idx < 0) continue;
      // 確定時点のシステム在庫を理論在庫として記録し直す（差異の根拠を正確にする）
      const lineIdx = confirmedLines.findIndex(
        (c) => c.goodsId === l.goodsId && c.variantId === l.variantId
      );
      if (lineIdx >= 0) confirmedLines[lineIdx] = { ...confirmedLines[lineIdx], theoretical: variants[idx].stockQuantity };

      if (variants[idx].stockQuantity !== l.actual) {
        variants[idx] = { ...variants[idx], stockQuantity: l.actual as number };
        changed = true;
      }
    }

    if (changed) {
      saveGoods({ ...goods, variants, updatedAt: now });
      revalidatePath(`/goods/${goodsId}`);
    }
  }

  saveStocktake({
    ...stocktake,
    lines: confirmedLines,
    status: "confirmed",
    updatedAt: now,
    confirmedAt: now,
  });

  revalidatePath("/stocktake");
  revalidatePath("/");
  redirect(`/stocktake/${stocktakeId}?confirmed=1`);
}
