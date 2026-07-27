"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getWrestlerById } from "@/lib/wrestlerStore";
import { saveIncentiveRule, deleteIncentiveRule } from "@/lib/incentiveRuleStore";
import type { IncentiveBasis, IncentiveChannel } from "@/types/incentiveRule";

const CHANNELS = ["venue", "ec", "hand", "all"];
const BASIS = ["sales", "profit", "fixed"];

export async function addRuleAction(formData: FormData): Promise<void> {
  const wrestlerId = formData.get("wrestlerId")?.toString() || null;
  const channel = formData.get("channel")?.toString() ?? "";
  const basis = formData.get("basis")?.toString() ?? "";
  const value = Number(formData.get("value") ?? 0);
  const startDate = formData.get("startDate")?.toString() ?? "";
  const note = formData.get("note")?.toString().trim() || undefined;

  if (!CHANNELS.includes(channel) || !BASIS.includes(basis)) redirect("/incentive/rules?error=invalid");
  if (value <= 0) redirect("/incentive/rules?error=value");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) redirect("/incentive/rules?error=date");
  if (wrestlerId && !getWrestlerById(wrestlerId)) redirect("/incentive/rules?error=invalid");

  saveIncentiveRule({
    id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    wrestlerId,
    channel: channel as IncentiveChannel,
    basis: basis as IncentiveBasis,
    value,
    startDate,
    note,
  });
  revalidatePath("/incentive/rules");
  revalidatePath("/incentive");
  redirect("/incentive/rules?saved=1");
}

export async function deleteRuleAction(formData: FormData): Promise<void> {
  const id = formData.get("id")?.toString() ?? "";
  if (id) deleteIncentiveRule(id);
  revalidatePath("/incentive/rules");
  revalidatePath("/incentive");
  redirect("/incentive/rules");
}
