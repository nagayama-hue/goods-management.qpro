"use server";

import { redirect } from "next/navigation";
import { updateEvent } from "@/lib/eventStore";
import type { EventType } from "@/types/event";

export async function updateEventAction(formData: FormData) {
  const id          = formData.get("id")       as string;
  const type        = formData.get("type")     as EventType;
  const date        = (formData.get("date")     as string)?.trim();
  const name        = (formData.get("name")     as string)?.trim();
  const capacityRaw = (formData.get("capacity") as string)?.trim();
  const targetRaw   = (formData.get("target")   as string)?.trim();
  const memo        = (formData.get("memo")     as string)?.trim() || undefined;

  if (!id || !type || !date || !name || !targetRaw) {
    throw new Error("種別・日付・名称・売上目標は必須です");
  }

  const target   = parseInt(targetRaw, 10);
  const capacity = capacityRaw ? parseInt(capacityRaw, 10) : undefined;

  updateEvent(id, {
    type,
    date,
    name,
    target:   isNaN(target) ? 0 : target,
    capacity: capacity && !isNaN(capacity) ? capacity : undefined,
    memo,
  });

  redirect("/events");
}
