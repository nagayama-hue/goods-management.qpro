"use server";

import { saveTarget } from "@/lib/targetStore";
import type { MonthlyTarget } from "@/types/target";

export async function saveTargetAction(
  data: MonthlyTarget
): Promise<{ ok: boolean; error?: string }> {
  try {
    saveTarget(data);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存に失敗しました" };
  }
}
