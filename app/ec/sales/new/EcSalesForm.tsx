"use client";

import { useActionState, useState, useMemo } from "react";
import Link from "next/link";
import type { Goods } from "@/types/goods";

const SALE_TYPE_LABELS: Record<string, string> = {
  normal:   "通常販売",
  campaign: "企画販売",
  bundle:   "セット販売",
  discount: "値引き販売",
};

interface Props {
  goodsList: Goods[];
  initialBundleId?: string;
  savedBundle?: boolean;
  action: (
    prevState: { error: string } | null,
    formData: FormData
  ) => Promise<{ error: string } | null>;
}

export default function EcSalesForm({ goodsList, initialBundleId, savedBundle, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, null);
  const today = new Date().toISOString().slice(0, 10);

  const [selectedGoodsId, setSelectedGoodsId] = useState<string>(goodsList[0]?.id ?? "");
  const selectedGoods = useMemo(
    () => goodsList.find((g) => g.id === selectedGoodsId),
    [goodsList, selectedGoodsId]
  );

  const variants     = selectedGoods?.variants ?? [];
  const hasVariants  = variants.length > 0;
  const colorOptions = useMemo(
    () => [...new Set(variants.map((v) => v.color).filter(Boolean))],
    [variants]
  );

  const [selectedColor,     setSelectedColor]     = useState<string>(colorOptions[0] ?? "");
  const [selectedVariantId, setSelectedVariantId] = useState<string>(() => variants[0]?.id ?? "");
  const [sellingPrice,      setSellingPrice]       = useState<number>(
    variants[0]?.sellingPrice ?? goodsList[0]?.sales.sellingPrice ?? 0
  );
  const [listPrice,  setListPrice]  = useState<number>(
    variants[0]?.sellingPrice ?? goodsList[0]?.sales.sellingPrice ?? 0
  );
  const [unitCost,   setUnitCost]   = useState<number>(variants[0]?.unitCost ?? 0);
  const [quantity,   setQuantity]   = useState<number>(1);

  // 販売種別
  const [saleType,       setSaleType]      = useState<string>(initialBundleId ? "bundle" : "normal");
  const [campaignName,   setCampaignName]  = useState<string>("");
  const [bundleIdValue,  setBundleIdValue] = useState<string>(initialBundleId ?? "");
  const [bundleIdLocked, setBundleIdLocked] = useState<boolean>(!!initialBundleId);

  const sizeOptions = useMemo(
    () => variants.filter((v) => v.color === selectedColor),
    [variants, selectedColor]
  );
  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId),
    [variants, selectedVariantId]
  );

  function handleGoodsChange(goodsId: string) {
    setSelectedGoodsId(goodsId);
    const g    = goodsList.find((g) => g.id === goodsId);
    const vars = g?.variants ?? [];
    const firstColor = vars[0]?.color ?? "";
    setSelectedColor(firstColor);
    setSelectedVariantId(vars[0]?.id ?? "");
    const price = vars[0]?.sellingPrice ?? g?.sales.sellingPrice ?? 0;
    setSellingPrice(price);
    setListPrice(price);
    setUnitCost(vars[0]?.unitCost ?? 0);
  }

  function handleColorChange(color: string) {
    setSelectedColor(color);
    const first = variants.find((v) => v.color === color);
    if (first) {
      setSelectedVariantId(first.id);
      const price = first.sellingPrice ?? selectedGoods?.sales.sellingPrice ?? 0;
      setSellingPrice(price);
      setListPrice(price);
      setUnitCost(first.unitCost ?? 0);
    }
  }

  function handleVariantChange(variantId: string) {
    setSelectedVariantId(variantId);
    const v = variants.find((vv) => vv.id === variantId);
    if (v) {
      const price = v.sellingPrice ?? selectedGoods?.sales.sellingPrice ?? 0;
      setSellingPrice(price);
      setListPrice(price);
      setUnitCost(v.unitCost ?? 0);
    }
  }

  const revenue        = sellingPrice * quantity;
  const grossProfit    = (sellingPrice - unitCost) * quantity;
  const discountPerUnit = saleType !== "normal" ? Math.max(0, listPrice - sellingPrice) : 0;

  return (
    <form action={formAction} className="space-y-6">
      {savedBundle && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ セット販売として登録しました。同じセットIDで続けて別の商品を登録できます。
        </div>
      )}
      {state?.error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.error}
        </div>
      )}

      {/* 商品選択 */}
      <section className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">商品</h2>
        <select
          name="goodsId"
          value={selectedGoodsId}
          onChange={(e) => handleGoodsChange(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {goodsList.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </section>

      {/* バリエーション */}
      {hasVariants && (
        <section className="rounded border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">カラー・サイズ</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {colorOptions.length > 1 && (
              <div>
                <label className="block text-xs text-gray-500">カラー</label>
                <select
                  value={selectedColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {colorOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500">サイズ / バリエーション</label>
              <select
                value={selectedVariantId}
                onChange={(e) => handleVariantChange(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {sizeOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.size || v.color || v.id}（在庫: {v.stockQuantity}個）
                  </option>
                ))}
              </select>
            </div>
          </div>
          <input type="hidden" name="variantId" value={selectedVariantId} />
          {selectedVariant && (
            <p className="mt-2 text-xs text-gray-400">現在の在庫: {selectedVariant.stockQuantity}個</p>
          )}
        </section>
      )}

      {/* 販売種別 */}
      <section className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">販売種別</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-gray-500" htmlFor="saleType">種別</label>
            <select
              id="saleType"
              name="saleType"
              value={saleType}
              onChange={(e) => setSaleType(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {Object.entries(SALE_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          {saleType !== "normal" && (
            <div>
              <label className="block text-xs text-gray-500" htmlFor="listPrice">定価（円）</label>
              <input
                id="listPrice"
                name="listPrice"
                type="number"
                min="0"
                step="1"
                value={listPrice}
                onChange={(e) => setListPrice(Math.max(0, Number(e.target.value)))}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              {discountPerUnit > 0 && (
                <p className="mt-1 text-xs text-orange-500">
                  値引き: ¥{discountPerUnit.toLocaleString()}/個
                </p>
              )}
            </div>
          )}
          {saleType === "campaign" && (
            <div>
              <label className="block text-xs text-gray-500" htmlFor="campaignName">企画名</label>
              <input
                id="campaignName"
                name="campaignName"
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="例: 春の大感謝セール"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}
          {saleType === "bundle" && (
            <div>
              <label className="block text-xs text-gray-500">セットID</label>
              {!bundleIdValue ? (
                <p className="mt-1 text-xs text-gray-400">
                  初回登録後に自動生成。次回から自動で引き継ぎます。
                </p>
              ) : bundleIdLocked ? (
                <div className="mt-1 flex items-center gap-2">
                  <span className="flex-1 truncate rounded border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-500">
                    {bundleIdValue}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBundleIdLocked(false)}
                    className="shrink-0 text-xs text-blue-500 hover:underline"
                  >
                    変更する
                  </button>
                  <input type="hidden" name="bundleId" value={bundleIdValue} />
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  <input
                    name="bundleId"
                    type="text"
                    value={bundleIdValue}
                    onChange={(e) => setBundleIdValue(e.target.value)}
                    className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  {initialBundleId && (
                    <button
                      type="button"
                      onClick={() => { setBundleIdValue(initialBundleId); setBundleIdLocked(true); }}
                      className="shrink-0 text-xs text-gray-500 hover:underline"
                    >
                      元に戻す
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 販売情報 */}
      <section className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">販売情報</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs text-gray-500" htmlFor="saleDate">
              販売日 <span className="text-red-500">*</span>
            </label>
            <input
              id="saleDate" name="saleDate" type="date" required
              defaultValue={today}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500" htmlFor="location">
              販売場所
            </label>
            <input
              id="location" name="location" type="text"
              defaultValue="公式EC"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500" htmlFor="quantity">
              数量 <span className="text-red-500">*</span>
            </label>
            <input
              id="quantity" name="quantity" type="number" min="1" step="1" required
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500" htmlFor="sellingPrice">
              販売単価（円） <span className="text-red-500">*</span>
            </label>
            <input
              id="sellingPrice" name="sellingPrice" type="number" min="0" step="1" required
              value={sellingPrice}
              onChange={(e) => setSellingPrice(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500" htmlFor="unitCost">
              原価（円）
            </label>
            <input
              id="unitCost" name="unitCost" type="number" min="0" step="1"
              value={unitCost}
              onChange={(e) => setUnitCost(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs text-gray-500" htmlFor="memo">メモ</label>
            <input
              id="memo" name="memo" type="text"
              placeholder="例: 春セール価格"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* プレビュー */}
      <section className="rounded border border-blue-100 bg-blue-50 p-4">
        <h2 className="mb-2 text-sm font-semibold text-blue-700">登録内容プレビュー</h2>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-gray-500">売上</dt>
            <dd className="font-semibold text-gray-800">¥{revenue.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">粗利</dt>
            <dd className={`font-semibold ${grossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
              ¥{grossProfit.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">粗利率</dt>
            <dd className="font-semibold text-gray-800">
              {sellingPrice > 0 ? `${Math.round((grossProfit / revenue) * 100)}%` : "—"}
            </dd>
          </div>
          {discountPerUnit > 0 && (
            <div>
              <dt className="text-xs text-gray-500">値引き合計</dt>
              <dd className="font-semibold text-orange-500">
                ¥{(discountPerUnit * quantity).toLocaleString()}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <div className="flex items-center justify-between">
        <Link href="/ec/sales" className="text-sm text-gray-500 hover:text-gray-700">
          ← EC売上一覧に戻る
        </Link>
        <div className="flex gap-3">
          <Link
            href="/ec/sales"
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {isPending ? "登録中..." : "EC売上を登録"}
          </button>
        </div>
      </div>
    </form>
  );
}
