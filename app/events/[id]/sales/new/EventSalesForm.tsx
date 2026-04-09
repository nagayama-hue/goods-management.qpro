"use client";

import { useActionState, useState, useMemo } from "react";
import Link from "next/link";
import type { Goods } from "@/types/goods";
import type { EventTarget } from "@/types/event";

interface Props {
  event: EventTarget;
  goodsList: Goods[];
  action: (
    prevState: { error: string } | null,
    formData: FormData
  ) => Promise<{ error: string } | null>;
}

export default function EventSalesForm({ event, goodsList, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, null);

  // バリアントを持つ商品のみ選択肢に出す（バリアントなし商品は単価設定が曖昧なので除外しない）
  const [selectedGoodsId, setSelectedGoodsId] = useState<string>(goodsList[0]?.id ?? "");
  const selectedGoods = useMemo(
    () => goodsList.find((g) => g.id === selectedGoodsId),
    [goodsList, selectedGoodsId]
  );

  const variants = selectedGoods?.variants ?? [];
  const hasVariants = variants.length > 0;

  // カラーの選択肢
  const colorOptions = useMemo(
    () => [...new Set(variants.map((v) => v.color).filter(Boolean))],
    [variants]
  );

  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");

  // 商品変更時にバリアント選択をリセット
  function handleGoodsChange(id: string) {
    setSelectedGoodsId(id);
    setSelectedColor("");
    setSelectedVariantId("");
    setSellingPrice(goodsList.find((g) => g.id === id)?.sales.sellingPrice ?? 0);
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

  const sizeOptions = useMemo(
    () => variants.filter((v) => v.color === selectedColor),
    [variants, selectedColor]
  );

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId),
    [variants, selectedVariantId]
  );

  const [sellingPrice, setSellingPrice] = useState<number>(
    selectedGoods?.sales.sellingPrice ?? 0
  );
  const [unitCost, setUnitCost] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);

  const revenue     = sellingPrice * quantity;
  const grossProfit = (sellingPrice - unitCost) * quantity;

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
          {state.error}
        </div>
      )}

      {/* 大会情報（表示のみ） */}
      <section className="rounded border border-blue-100 bg-blue-50/50 p-4">
        <p className="text-xs text-blue-600 font-medium mb-1">対象大会</p>
        <p className="text-sm font-semibold text-gray-900">{event.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{event.date}</p>
      </section>

      {/* 商品選択 */}
      <section className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">商品</h2>
        {goodsList.length === 0 ? (
          <p className="text-sm text-gray-400">
            登録済みの商品がありません。先に商品を登録してください。
          </p>
        ) : (
          <div>
            <label className="block text-xs text-gray-500" htmlFor="goodsId">
              商品を選択 <span className="text-red-500">*</span>
            </label>
            <select
              id="goodsId"
              name="goodsId"
              value={selectedGoodsId}
              onChange={(e) => handleGoodsChange(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {goodsList.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* バリエーション選択 */}
      {hasVariants && (
        <section className="rounded border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">カラー・サイズ</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {colorOptions.length > 0 && (
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
            {selectedColor && sizeOptions.length > 0 && (
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
          {selectedVariant && (
            <p className="mt-2 text-xs text-gray-400">
              現在の在庫: {selectedVariant.stockQuantity}個
            </p>
          )}
        </section>
      )}

      {!hasVariants && selectedGoods && (
        <div className="rounded border border-yellow-100 bg-yellow-50 px-4 py-3 text-xs text-yellow-700">
          この商品にはバリエーションが設定されていません。先に商品編集でバリエーションを追加することを推奨します。
        </div>
      )}

      {/* 販売情報 */}
      <section className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">販売情報</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs text-gray-500" htmlFor="quantity">
              販売数 <span className="text-red-500">*</span>
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
              placeholder="例: 割引販売、セット販売など"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* プレビュー */}
      <section className="rounded border border-green-100 bg-green-50/50 p-4">
        <h2 className="mb-2 text-sm font-semibold text-green-700">登録内容プレビュー</h2>
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
        <p className="mt-2 text-xs text-gray-400">
          保存後、大会詳細の物販売上（自動集計）に反映されます。
        </p>
      </section>

      <div className="flex items-center justify-between">
        <Link href={`/events/${event.id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← 大会詳細に戻る
        </Link>
        <div className="flex gap-3">
          <Link
            href={`/events/${event.id}`}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={isPending || goodsList.length === 0}
            className="rounded bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? "登録中..." : "売上を登録"}
          </button>
        </div>
      </div>
    </form>
  );
}
