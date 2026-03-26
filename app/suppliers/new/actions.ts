"use server";

import { redirect } from "next/navigation";
import { createSupplier } from "@/lib/supplierStore";
import {
  SUPPLIER_GENRES,
  type SupplierGenre,
  type PriceSense,
  type DeliverySpeed,
  type QualityLevel,
  type SupplierRating,
} from "@/types/supplier";

export async function createSupplierAction(formData: FormData) {
  const name          = (formData.get("name")          as string)?.trim();
  const contactName   = (formData.get("contactName")   as string)?.trim() || undefined;
  const phone         = (formData.get("phone")         as string)?.trim() || undefined;
  const email         = (formData.get("email")         as string)?.trim() || undefined;
  const genres        = SUPPLIER_GENRES.filter((g) => formData.get(`genre_${g}`) === "on");
  const priceSense    = formData.get("priceSense")    as PriceSense;
  const deliveryDaysR = (formData.get("deliveryDays") as string)?.trim();
  const deliverySpeed = formData.get("deliverySpeed") as DeliverySpeed;
  const minLotRaw     = (formData.get("minLot")       as string)?.trim();
  const quality       = formData.get("quality")       as QualityLevel;
  const ratingRaw     = (formData.get("rating")       as string)?.trim();
  const memo          = (formData.get("memo")         as string)?.trim() || undefined;

  if (!name || !priceSense || !deliverySpeed || !quality || !ratingRaw) {
    throw new Error("必須項目を入力してください");
  }

  const deliveryDays = deliveryDaysR ? parseInt(deliveryDaysR, 10) : undefined;
  const minLot       = minLotRaw     ? parseInt(minLotRaw,     10) : undefined;
  const rating       = Math.min(5, Math.max(1, parseInt(ratingRaw, 10))) as SupplierRating;

  createSupplier({
    name,
    contactName,
    phone,
    email,
    genres: genres as SupplierGenre[],
    priceSense,
    deliveryDays: deliveryDays && !isNaN(deliveryDays) ? deliveryDays : undefined,
    deliverySpeed,
    minLot: minLot && !isNaN(minLot) ? minLot : undefined,
    quality,
    rating,
    memo,
  });

  redirect("/suppliers");
}
