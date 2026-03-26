"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCampaignById, saveCampaign } from "@/lib/ecCampaignStore";
import type { EcCampaignType } from "@/types/ecCampaign";

export async function updateCampaignAction(formData: FormData) {
  const id          = formData.get("id") as string;
  const type        = formData.get("type") as EcCampaignType;
  const name        = (formData.get("name") as string).trim();
  const targetMonth = formData.get("targetMonth") as string;
  const target      = parseInt(formData.get("target") as string, 10);
  const memo        = (formData.get("memo") as string | null)?.trim() || undefined;

  if (!id || !type || !name || !targetMonth || isNaN(target)) return;

  const existing = getCampaignById(id);
  if (!existing) return;

  saveCampaign({
    ...existing,
    type,
    name,
    targetMonth,
    target,
    memo,
  });

  revalidatePath("/ec/campaigns");
  revalidatePath("/ec");
  revalidatePath("/dashboard");
  redirect("/ec/campaigns");
}
