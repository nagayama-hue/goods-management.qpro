"use server";

import { getGoodsById, saveGoods } from "@/lib/store";
import { revalidatePath } from "next/cache";
import type { Priority, GoodsStatus } from "@/types/goods";

/**
 * 会議ビューからの優先度・ステータス即時更新。
 * 将来的に updatedBy（変更者）や changeReason（変更理由）を fields に追加しやすい構造。
 */
export async function updateGoodsFields(
  id: string,
  fields: { priority?: Priority; status?: GoodsStatus }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const goods = getGoodsById(id);
    if (!goods) return { ok: false, error: "商品が見つかりません" };

    const updated = {
      ...goods,
      ...fields,
      updatedAt: new Date().toISOString(), // 変更日時を記録（将来の変更履歴対応の余地）
    };

    saveGoods(updated);

    // 関連するすべてのパスを再検証
    revalidatePath("/meeting");
    revalidatePath("/");
    revalidatePath(`/goods/${id}`);

    return { ok: true };
  } catch {
    return { ok: false, error: "保存に失敗しました" };
  }
}
