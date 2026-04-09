import type { GoodsVariant } from "@/types/goods";

/** 売上取消し: 在庫を戻し、販売数を減算する */
export function restoreVariantStock(variant: GoodsVariant, quantity: number): GoodsVariant {
  return {
    ...variant,
    stockQuantity: variant.stockQuantity + quantity,
    soldQuantity:  Math.max(0, variant.soldQuantity - quantity),
  };
}

/** 売上適用: 在庫を減算し、販売数を加算する */
export function applyVariantSale(variant: GoodsVariant, quantity: number): GoodsVariant {
  return {
    ...variant,
    stockQuantity: variant.stockQuantity - quantity,
    soldQuantity:  variant.soldQuantity + quantity,
  };
}
