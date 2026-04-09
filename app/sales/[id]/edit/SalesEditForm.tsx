"use client";

import { useActionState, useState, useMemo } from "react";
import Link from "next/link";
import type { Goods } from "@/types/goods";
import type { SalesRecord } from "@/types/salesRecord";

interface Props {
  record: SalesRecord;
  goodsList: Goods[];
  returnTo: string;
  action: (
    prevState: { error: string } | null,
    formData: FormData
  ) => Promise<{ error: string } | null>;
}

export default function SalesEditForm({ record, goodsList, returnTo, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, null);

  // 商品選択
  const [selectedGoodsId, setSelectedGoodsId] = useState<string>(record.goodsId);
  const selectedGoods = useMemo(
    () => goodsList.find((g) => g.id === selectedGoodsId),
    [goodsList, selectedGoodsId]
  );
  const variants = selectedGoods?.variants ?? [];
  const hasVariants = variants.length > 0;

  // カラー選択肢
  const colorOptions = useMemo(
    () => [...new Set(variants.map((v) => v.color).filter(Boolean))],
    [variants]
  );

  // 初期カラー・バリアントを既存レコードから設定
  const initColor = record.color && colorOptions.includes(record.color)
    ? record.color
    : colorOptions[0] ?? "";
  const [selectedColor, setSelectedColor] = useState<string>(initColor);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    record.variantId ?? variants[0]?.id ?? ""
  );

  const sizeOptions = useMemo(
    () => variants.filter((v) => v.color === selectedColor),
    [variants, selectedColor]
  );
  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId),
    [variants, selectedVariantId]
  );

  const [sellingPrice, setSellingPrice] = useState<number>(record.sellingPrice);
  const [unitCost, setUnitCost] = useState<number>(record.unitCost);
  const [quantity, setQuantity] = useState<number>(record.quantity);

  function handleGoodsChange(id: string) {
    setSelectedGoodsId(id);
    setSelectedColor("");
    setSelectedVariantId("");
    const g = goodsList.find((g) => g.id === id);
    setSellingPrice(g?.sales.sellingPrice ?? 0);
    setUnitCost(0);
  }

  function handleColorChange(color: string) {
    setSelectedColor(color);
    const first = variants.find((v) => v.color === color);
    if (first) {
      setSelectedVariantId(first.id);
      setSellingPrice(first.sellingPrice ?? selectedGoods?.sales.sellingPrice ?? 0);
      setUnitCost(first.unitCost ?? 0);
    }
  }

  function handleVariantChange(variantId: string) {
    setSelectedVariantId(variantId);
    const v = variants.find((vv) => vv.id === variantId);
    if (v) {
      setSellingPrice(v.sellingPrice ?? selectedGoods?.sales.sellingPrice ?? 0);
      setUnitCost(v.unitCost ?? 0);
    }
  }

  const revenue     = sellingPrice * quantity;
  const grossProfit = (sellingPrice - unitCost) * quantity;

  // 同バリアントの場合、実際に使える在庫 = 現在庫 + 旧数量（旧分は差し戻し対象）
  const effectiveStock = selectedVariant
    ? selectedVariantId === record.variantId
      ? selectedVariant.stockQuantity + record.quantity
      : selectedVariant.stockQuantity
    : null;

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
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

      {/* バリエーション選択 */}
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
                  <option value="">選択してください</option>
                  {colorOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
            {colorOptions.length === 1 && (
              <div>
                <label className="block text-xs text-gray-500">カラー</label>
                <p className="mt-1 text-sm text-gray-700">{colorOptions[0]}</p>
              </div>
            )}
            {sizeOptions.length > 0 && (
              <div>
                <label className="block text-xs text-gray-500">サイズ</label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => handleVariantChange(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {sizeOptions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.size || "サイズなし"}（在庫: {v.stockQuantity}個）
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <input type="hidden" name="variantId" value={selectedVariantId} />
          {effectiveStock !== null && (
            <p className="mt-2 text-xs text-gray-400">
              変更可能な最大数量: {effectiveStock}個
              {selectedVariantId === record.variantId && (
                <span className="ml-1 text-gray-300">（旧数量{record.quantity}個を含む）</span>
              )}
            </p>
          )}
        </section>
      )}

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
              defaultValue={record.saleDate}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500" htmlFor="location">
              販売場所 <span className="text-red-500">*</span>
            </label>
            <input
              id="location" name="location" type="text" required
              defaultValue={record.location}
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
            <label className="block text-xs text-gray-500" htmlFor="memo">
              メモ
            </label>
            <input
              id="memo" name="memo" type="text"
              defaultValue={record.memo ?? ""}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* プレビュー */}
      <section className="rounded border border-blue-100 bg-blue-50 p-4">
        <h2 className="mb-2 text-sm font-semibold text-blue-700">変更後プレビュー</h2>
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
        </dl>
      </section>

      <div className="flex items-center justify-between">
        <Link href={returnTo} className="text-sm text-gray-500 hover:text-gray-700">
          ← 戻る
        </Link>
        <div className="flex gap-3">
          <Link
            href={returnTo}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "保存中..." : "変更を保存"}
          </button>
        </div>
      </div>
    </form>
  );
}
