"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAllWrestlers, getWrestlerById, saveWrestler } from "@/lib/wrestlerStore";

export async function addWrestlerAction(formData: FormData): Promise<void> {
  const name = formData.get("name")?.toString().trim() ?? "";
  if (!name) redirect("/incentive/wrestlers?error=empty");

  const exists = getAllWrestlers().some((w) => w.name === name);
  if (exists) redirect("/incentive/wrestlers?error=duplicate");

  saveWrestler({
    id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    active: true,
    createdAt: new Date().toISOString(),
  });
  revalidatePath("/incentive/wrestlers");
  revalidatePath("/incentive/links");
  redirect("/incentive/wrestlers?saved=1");
}

export async function toggleWrestlerActiveAction(formData: FormData): Promise<void> {
  const id = formData.get("id")?.toString() ?? "";
  const wrestler = getWrestlerById(id);
  if (!wrestler) redirect("/incentive/wrestlers");

  saveWrestler({ ...wrestler, active: !wrestler.active });
  revalidatePath("/incentive/wrestlers");
  revalidatePath("/incentive/links");
  redirect("/incentive/wrestlers");
}
