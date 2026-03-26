"use server";

import { revalidatePath } from "next/cache";
import { updateEventActual } from "@/lib/eventStore";

export async function updateActualAction(formData: FormData) {
  const id             = formData.get("id")              as string;
  const actualStr      = (formData.get("actual")         as string)?.trim();
  const actualCapStr   = (formData.get("actualCapacity") as string)?.trim();

  const actual         = actualStr    ? parseInt(actualStr,    10) : undefined;
  const actualCapacity = actualCapStr ? parseInt(actualCapStr, 10) : undefined;

  updateEventActual(
    id,
    actual         !== undefined && !isNaN(actual)         ? actual         : undefined,
    actualCapacity !== undefined && !isNaN(actualCapacity) ? actualCapacity : undefined,
  );

  revalidatePath("/events");
  revalidatePath("/events/results");
}
