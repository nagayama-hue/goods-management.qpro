"use server";

import { revalidatePath } from "next/cache";
import { updateCampaignActual } from "@/lib/ecCampaignStore";

export async function updateActualAction(formData: FormData) {
  const id     = formData.get("id") as string;
  const actual = parseInt(formData.get("actual") as string, 10);

  if (!id || isNaN(actual) || actual < 0) return;

  updateCampaignActual(id, actual);
  revalidatePath("/ec/campaigns");
  revalidatePath("/ec");
  revalidatePath("/dashboard");
}
