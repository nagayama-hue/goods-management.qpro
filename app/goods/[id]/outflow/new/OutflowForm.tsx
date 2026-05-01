"use client";

import { useActionState, useState, useMemo } from "react";
import Link from "next/link";
import type { Goods } from "@/types/goods";

const OUTFLOW_TYPES = ["贈答", "サンプル", "協賛提供", "その他"] as const;

interface Props {
  goods: Goods;
  action: (
    prevState: { error: string } | null,
    formData: FormData
  ) => Promise<{ error: string } | null>;
}

export default function OutflowForm({ goods, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, null);
  const today = new Date().toISOString().slice(0, 10);

  const variants = goods.variants ?? [];

  const colorOptions = useMemo(
    () => [...new Set(variants.map((v) => v.color).filter(Boolean))],
    [variants]
  );

  const [selectedColor, setSelectedColor] = useState<string>(colorOptions[0] ?? "");
  const [selectedVariantId, setSelectedVariantId] = useState<string>(() => {
    const first = variants.find((v) => v.color === (colorOptions[0] ?? ""));
    return first?.id ?? variants[0]?.id ?? "";
  });

  const sizeOptions = useMemo(
    () => variants.filter((v) => v.color === selectedColor),
    [variants, selectedColor]
  );

  function handleColorChange(color: string) {
    setSelectedColor(color);
    const first = variants.find((v) => v.color === color);
    setSelectedVariantId(first?.id ?? "");
  }

  function handleVariantChange(variantId: string) {
    setSelectedVariantId(variantId);
  }

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const currentStock = selectedVariant?.stockQuantity ?? 0;

  // Single-variant (default 標準/FREE): skip color/size selects
  const isDefault =
    variants.length === 1 &&
    variants[0].color === "標準" &&
    variants[0].size === "FREE";

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* 商品名 */}
      <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
        <span className="font-medium">商品：</span>{goods.name}
      </div>

      {/* カラー・サイズ選択 */}
      {!isDefault && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              カラー <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {colorOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              サイズ <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedVariantId}
              onChange={(e) => handleVariantChange(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {sizeOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.size || "（サイズなし）"} — 在庫 {v.stockQuantity}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* hidden variantId */}
      <input type="hidden" name="variantId" value={selectedVariantId} />

      {/* 現在庫 表示 */}
      <div className="text-sm text-gray-500">
        現在庫：<span className="font-medium text-gray-800">{currentStock}</span> 個
      </div>

      {/* 数量 */}
      <div>
        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
          出庫数量 <span className="text-red-500">*</span>
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          max={currentStock}
          defaultValue={1}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* 出庫区分 */}
      <div>
        <label htmlFor="outflowType" className="block text-sm font-medium text-gray-700">
          出庫区分 <span className="text-red-500">*</span>
        </label>
        <select
          id="outflowType"
          name="outflowType"
          defaultValue="その他"
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {OUTFLOW_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* 日付 */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
          出庫日 <span className="text-red-500">*</span>
        </label>
        <input
          id="date"
          name="date"
          type="date"
          defaultValue={today}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* メモ */}
      <div>
        <label htmlFor="memo" className="block text-sm font-medium text-gray-700">
          メモ
        </label>
        <textarea
          id="memo"
          name="memo"
          rows={3}
          placeholder="贈答先・用途など"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* アクション */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-700 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-600 disabled:opacity-50"
        >
          {isPending ? "登録中…" : "出庫を登録"}
        </button>
        <Link
          href={`/goods/${goods.id}`}
          className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          キャンセル
        </Link>
      </div>
    </form>
  );
}
