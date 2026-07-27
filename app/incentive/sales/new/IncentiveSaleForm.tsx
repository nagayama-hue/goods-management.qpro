"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { resolveRule, ruleDescription, calcLineAmount } from "@/lib/incentiveRuleResolve";
import type { IncentiveRule } from "@/types/incentiveRule";

interface VariantOption {
  id: string;
  color: string;
  size: string;
  stockQuantity: number;
  sellingPrice?: number;
  unitCost?: number;
}

interface GoodsOption {
  id: string;
  name: string;
  sellingPrice: number;
  variants: VariantOption[];
}

interface WrestlerOption { id: string; name: string; }
interface EventOption { id: string; name: string; date: string; }

interface Props {
  goodsList: GoodsOption[];
  wrestlers: WrestlerOption[];
  events: EventOption[];
  rules: IncentiveRule[];
  action: (
    prevState: { error: string } | null,
    formData: FormData
  ) => Promise<{ error: string } | null>;
}

const CHANNEL_OPTIONS = [
  { value: "event", label: "会場販売", hint: "大会・イベントのブース販売" },
  { value: "hand", label: "手売り", hint: "選手本人の手売り（全グッズ対象）" },
  { value: "ec", label: "EC販売", hint: "ECサイトでの販売" },
] as const;

function yen(n: number): string {
  return "¥" + n.toLocaleString("ja-JP");
}

export default function IncentiveSaleForm({ goodsList, wrestlers, events, rules, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, null);
  const today = new Date().toISOString().slice(0, 10);

  const [channel, setChannel]   = useState<string>("event");
  const [wrestlerId, setWrestlerId] = useState<string>("");
  const [saleDate, setSaleDate] = useState<string>(today);
  const [handReported, setHandReported] = useState<boolean>(true);

  const [selectedGoodsId, setSelectedGoodsId] = useState<string>(goodsList[0]?.id ?? "");
  const selectedGoods = useMemo(
    () => goodsList.find((g) => g.id === selectedGoodsId),
    [goodsList, selectedGoodsId]
  );
  const variants = selectedGoods?.variants ?? [];

  const [selectedVariantId, setSelectedVariantId] = useState<string>(variants[0]?.id ?? "");
  const [sellingPrice, setSellingPrice] = useState<number>(
    variants[0]?.sellingPrice ?? goodsList[0]?.sellingPrice ?? 0
  );
  const [unitCost, setUnitCost] = useState<number>(variants[0]?.unitCost ?? 0);
  const [quantity, setQuantity] = useState<number>(1);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  function handleGoodsChange(goodsId: string) {
    setSelectedGoodsId(goodsId);
    const g = goodsList.find((x) => x.id === goodsId);
    const v = g?.variants[0];
    setSelectedVariantId(v?.id ?? "");
    setSellingPrice(v?.sellingPrice ?? g?.sellingPrice ?? 0);
    setUnitCost(v?.unitCost ?? 0);
  }

  function handleVariantChange(variantId: string) {
    setSelectedVariantId(variantId);
    const v = variants.find((x) => x.id === variantId);
    if (v) {
      setSellingPrice(v.sellingPrice ?? selectedGoods?.sellingPrice ?? 0);
      setUnitCost(v.unitCost ?? 0);
    }
  }

  // ── インセンティブ額のリアルタイム計算 ──────────────────────────────
  const revenue     = sellingPrice * quantity;
  const grossProfit = (sellingPrice - unitCost) * quantity;
  const ruleChannel = channel === "ec" ? "ec" : channel === "hand" ? "hand" : "venue";
  const rule = wrestlerId ? resolveRule(rules, wrestlerId, ruleChannel, saleDate) : null;
  const handExcluded = channel === "hand" && !handReported;
  const preview = rule && !handExcluded
    ? calcLineAmount(rule, revenue, grossProfit, quantity, 100)
    : null;
  const costMissing = rule?.basis === "profit" && unitCost === 0;

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.error}
        </div>
      )}

      {/* 売れ方 */}
      <section className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          売れ方 <span className="text-red-500">*</span>
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {CHANNEL_OPTIONS.map((c) => (
            <label
              key={c.value}
              className={`cursor-pointer rounded border px-4 py-3 ${
                channel === c.value
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-300"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="channel"
                value={c.value}
                checked={channel === c.value}
                onChange={() => setChannel(c.value)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-800">{c.label}</span>
              <p className="mt-1 text-xs text-gray-400">{c.hint}</p>
            </label>
          ))}
        </div>
        {channel === "hand" && (
          <label className="mt-3 flex items-center gap-2 rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            <input
              type="checkbox"
              name="handSaleReported"
              checked={handReported}
              onChange={(e) => setHandReported(e.target.checked)}
            />
            Lark『グッズ管理』グループへ申請済み
            <span className="text-xs text-yellow-600">（連絡なしの手売りはインセンティブ対象外）</span>
          </label>
        )}
      </section>

      {/* 選手 */}
      <section className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          {channel === "hand" ? "売った選手" : "インセンティブの帰属選手"} <span className="text-red-500">*</span>
          <span className="ml-2 text-xs font-normal text-gray-400">
            {channel === "hand" ? "手売りは商品に関係なく売った選手本人に帰属します" : "この売上のインセンティブを受け取る選手"}
          </span>
        </h2>
        <select
          name="wrestlerId"
          value={wrestlerId}
          onChange={(e) => setWrestlerId(e.target.value)}
          className="w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">— 選手を選択 —</option>
          {wrestlers.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </section>

      {/* 商品 */}
      <section className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">商品 <span className="text-red-500">*</span></h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-gray-500">商品</label>
            <select
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
          {variants.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500">カラー・サイズ</label>
              <select
                value={selectedVariantId}
                onChange={(e) => handleVariantChange(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {[v.color, v.size].filter(Boolean).join(" / ") || v.id}（在庫: {v.stockQuantity}個）
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <input type="hidden" name="variantId" value={selectedVariantId} />
        {selectedVariant && (
          <p className="mt-2 text-xs text-gray-400">現在の在庫: {selectedVariant.stockQuantity}個（登録すると在庫が減ります）</p>
        )}
      </section>

      {/* 販売情報 */}
      <section className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">販売情報</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs text-gray-500" htmlFor="saleDate">販売日 <span className="text-red-500">*</span></label>
            <input
              id="saleDate" name="saleDate" type="date" required
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500" htmlFor="quantity">数量 <span className="text-red-500">*</span></label>
            <input
              id="quantity" name="quantity" type="number" min="1" step="1" required
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500" htmlFor="sellingPrice">販売単価（円・税込） <span className="text-red-500">*</span></label>
            <input
              id="sellingPrice" name="sellingPrice" type="number" min="0" step="1" required
              value={sellingPrice}
              onChange={(e) => setSellingPrice(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500" htmlFor="unitCost">原価（円）</label>
            <input
              id="unitCost" name="unitCost" type="number" min="0" step="1"
              value={unitCost}
              onChange={(e) => setUnitCost(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          {channel === "event" && (
            <div>
              <label className="block text-xs text-gray-500" htmlFor="eventId">大会（任意）</label>
              <select
                id="eventId" name="eventId" defaultValue=""
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">紐付けない</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.date}　{ev.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500" htmlFor="location">販売場所</label>
            <input
              id="location" name="location" type="text"
              placeholder={channel === "ec" ? "公式EC" : channel === "hand" ? "手売り" : "会場名"}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label className="block text-xs text-gray-500" htmlFor="memo">メモ</label>
            <input
              id="memo" name="memo" type="text"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* インセンティブプレビュー */}
      <section className={`rounded border p-4 ${preview ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"}`}>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">インセンティブ</h2>
        {!wrestlerId ? (
          <p className="text-sm text-gray-400">選手を選択するとインセンティブ額が表示されます。</p>
        ) : handExcluded ? (
          <p className="text-sm font-medium text-red-600">
            Lark申請なしの手売りはインセンティブ対象外です（売上・在庫のみ計上されます）。
          </p>
        ) : !rule ? (
          <p className="text-sm text-red-600">適用できるルールがありません（ルールタブを確認してください）。</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-gray-500">売上額</dt>
              <dd className="font-semibold text-gray-800 tabular-nums">{yen(revenue)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">粗利</dt>
              <dd className="font-semibold text-gray-800 tabular-nums">{yen(grossProfit)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">適用ルール</dt>
              <dd className="font-medium text-gray-700">{ruleDescription(rule, 100)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">インセンティブ額</dt>
              <dd className="text-lg font-bold text-blue-700 tabular-nums">{yen(preview!.amount)}</dd>
            </div>
          </dl>
        )}
        {costMissing && (
          <p className="mt-2 text-xs font-medium text-red-600">
            ⚠ 粗利ベースのルールですが原価が0円です。金額が過大になる可能性があります。
          </p>
        )}
      </section>

      <div className="flex items-center justify-between">
        <Link href="/incentive" className="text-sm text-gray-500 hover:text-gray-700">
          ← 月次集計に戻る
        </Link>
        <div className="flex gap-3">
          <Link
            href="/incentive"
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={isPending || !wrestlerId}
            className="rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "登録中..." : "売上を登録（在庫も減ります）"}
          </button>
        </div>
      </div>
    </form>
  );
}
