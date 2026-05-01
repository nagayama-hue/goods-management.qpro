import type { SaleType } from "@/types/salesRecord";

const VALID_SALE_TYPES: SaleType[] = ["normal", "campaign", "bundle", "discount", "employee_discount"];

export interface SaleTypeFields {
  saleType: SaleType;
  listPrice: number;        // 定価
  discountAmount: number;   // 値引き額/unit
  campaignName?: string;
  bundleId?: string;
}

/**
 * FormData から販売種別関連フィールドを読み取る。
 * @param formData
 * @param sellingPrice 実売単価（discountAmount 計算の基準）
 */
export function parseSaleTypeFields(
  formData: FormData,
  sellingPrice: number
): SaleTypeFields {
  const raw = formData.get("saleType")?.toString() ?? "normal";
  const saleType: SaleType = VALID_SALE_TYPES.includes(raw as SaleType)
    ? (raw as SaleType)
    : "normal";

  const listPriceRaw = Number(formData.get("listPrice") ?? sellingPrice);
  const listPrice    = listPriceRaw > 0 ? listPriceRaw : sellingPrice;
  const discountAmount = Math.max(0, listPrice - sellingPrice);

  const campaignName =
    saleType === "campaign"
      ? formData.get("campaignName")?.toString().trim() || undefined
      : undefined;

  let bundleId: string | undefined;
  if (saleType === "bundle") {
    const input = formData.get("bundleId")?.toString().trim();
    bundleId = input || `bundle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }

  return { saleType, listPrice, discountAmount, campaignName, bundleId };
}
