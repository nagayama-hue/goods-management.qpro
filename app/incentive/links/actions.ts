"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAllGoods } from "@/lib/store";
import { getActiveWrestlers } from "@/lib/wrestlerStore";
import {
  getAllGoodsIncentives,
  saveGoodsIncentive,
  deleteGoodsIncentive,
} from "@/lib/goodsIncentiveStore";
import type { IncentiveCategory, WrestlerLink } from "@/types/goodsIncentive";

/** 商品名マッチング用の正規化（﨑/崎の異体字・空白・大文字小文字の揺れを吸収） */
function normalizeName(s: string): string {
  return s.replace(/﨑/g, "崎").replace(/[\s　]+/g, "").toLowerCase();
}

export async function saveGoodsIncentiveAction(
  goodsId: string,
  category: string,
  links: WrestlerLink[]
): Promise<{ ok: boolean; error?: string }> {
  if (!["personal", "multi", "org"].includes(category)) {
    return { ok: false, error: "区分を選択してください。" };
  }
  const cat = category as IncentiveCategory;

  const wrestlerIds = new Set(getActiveWrestlers().map((w) => w.id));
  let normalized: WrestlerLink[] = links.filter((l) => wrestlerIds.has(l.wrestlerId));

  if (cat === "personal") {
    if (normalized.length !== 1) {
      return { ok: false, error: "個人グッズは選手を1名選択してください。" };
    }
    normalized = [{ wrestlerId: normalized[0].wrestlerId, sharePercent: 100 }];
  } else if (cat === "multi") {
    if (normalized.length < 2) {
      return { ok: false, error: "複数選手グッズは選手を2名以上選択してください。" };
    }
    const sum = normalized.reduce((s, l) => s + l.sharePercent, 0);
    if (sum !== 100) {
      return { ok: false, error: `按分の合計が ${sum}% です。100% にしてください。` };
    }
  } else {
    normalized = []; // org: 団体共通は紐付けなし
  }

  saveGoodsIncentive({
    goodsId,
    category: cat,
    links: normalized,
    updatedAt: new Date().toISOString(),
  });
  revalidatePath("/incentive/links");
  return { ok: true };
}

export async function clearGoodsIncentiveAction(goodsId: string): Promise<{ ok: boolean }> {
  deleteGoodsIncentive(goodsId);
  revalidatePath("/incentive/links");
  return { ok: true };
}

/**
 * 商品名からの自動推定（未設定の商品のみ対象。設定済みは上書きしない）
 * 1名ヒット → personal 100% ／ 2名以上 → multi 均等按分 ／ 0名 → 未設定のまま
 */
export async function autoSuggestAction(): Promise<void> {
  const wrestlers = getActiveWrestlers();
  const existing = new Set(getAllGoodsIncentives().map((x) => x.goodsId));
  let updated = 0;

  for (const g of getAllGoods()) {
    if (existing.has(g.id)) continue;
    const goodsName = normalizeName(g.name);
    const hits = wrestlers.filter((w) => goodsName.includes(normalizeName(w.name)));
    if (hits.length === 0) continue;

    let links: WrestlerLink[];
    let category: IncentiveCategory;
    if (hits.length === 1) {
      category = "personal";
      links = [{ wrestlerId: hits[0].id, sharePercent: 100 }];
    } else {
      category = "multi";
      const base = Math.floor(100 / hits.length);
      links = hits.map((w, i) => ({
        wrestlerId: w.id,
        sharePercent: i === 0 ? 100 - base * (hits.length - 1) : base,
      }));
    }
    saveGoodsIncentive({ goodsId: g.id, category, links, updatedAt: new Date().toISOString() });
    updated++;
  }

  revalidatePath("/incentive/links");
  redirect(`/incentive/links?suggested=${updated}`);
}
