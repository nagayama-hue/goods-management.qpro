"use server";

import { revalidatePath } from "next/cache";
import { saveTarget } from "@/lib/targetStore";
import type { MonthlyTarget } from "@/types/target";

export async function saveEcTargetsAction(
  targets: MonthlyTarget[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    for (const t of targets) {
      saveTarget(t);
    }
    revalidatePath("/ec");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/targets");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存に失敗しました" };
  }
}
