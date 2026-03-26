"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saveCampaign } from "@/lib/ecCampaignStore";
import type { EcCampaignType } from "@/types/ecCampaign";

export async function createCampaignAction(formData: FormData) {
  const type        = formData.get("type") as EcCampaignType;
  const name        = (formData.get("name") as string).trim();
  const targetMonth = formData.get("targetMonth") as string;
  const target      = parseInt(formData.get("target") as string, 10);
  const memo        = (formData.get("memo") as string | null)?.trim() || undefined;

  if (!type || !name || !targetMonth || isNaN(target)) return;

  saveCampaign({
    id:          crypto.randomUUID().slice(0, 8),
    type,
    name,
    targetMonth,
    target,
    memo,
    createdAt:   new Date().toISOString(),
  });

  revalidatePath("/ec/campaigns");
  revalidatePath("/ec");
  revalidatePath("/dashboard");
  redirect("/ec/campaigns");
}
