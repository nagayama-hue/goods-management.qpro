"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Goods, GoodsStatus, GoodsCategory, SalesChannel, Priority, GoodsVariant } from "@/types/goods";
import { SIZE_OPTIONS, COLOR_SUGGESTIONS } from "@/types/goods";

const CATEGORIES: GoodsCategory[] = [
  "Tシャツ", "パーカー・スウェット", "タオル",
  "アクスタ", "キーホルダー", "キャップ・バッグ",
  "ステッカー・クリアファイル", "応援グッズ",
  "書籍・カレンダー", "ポートレート・写真",
  "ガチャガチャ", "FC特典", "その他",
];

const STATUSES: GoodsStatus[] = [
  "案出し中", "検討中", "採用", "制作中", "発売中", "完売", "終了",
];

const SALES_CHANNELS: SalesChannel[] = ["会場", "EC", "FC限定", "会場+EC"];

const PRIORITIES: Priority[] = ["今すぐ作る", "次月候補", "保留", "却下", "未設定"];

interface Props {
  defaultValues?: Partial<Goods>;
  action: (
    prevState: { error: string } | null,
    formData: FormData
  ) => Promise<{ error: string } | null>;
  submitLabel: string;
  cancelHref: string;
}

/** 数値入力の共通props（0以上の整数のみ受け付ける） */
function numInputProps(name: string, defaultValue: number) {
  return {
    id: name,
    name,
    type: "number" as const,
    min: "0",
    step: "1",
    defaultValue,
    onInput: (e: React.FormEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      if (el.valueAsNumber < 0) el.value = "0";
    },
    className:
      "mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none",
  };
}

function newVariant(): GoodsVariant {
  return { id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, color: "", size: "", plannedQuantity: 0, stockQuantity: 0, soldQuantity: 0 };
}

export default function GoodsForm({ defaultValues, action, submitLabel, cancelHref }: Props) {
  const [state, formAction, isPending] = useActionState(action, null);
  const b = defaultValues?.budget;
  const s = defaultValues?.sales;

  const [variants, setVariants] = useState<GoodsVariant[]>(defaultValues?.variants ?? []);

  const updateVariant = (i: number, field: keyof GoodsVariant, value: string | number | undefined) =>
    setVariants((prev) => prev.map((v, idx) => idx === i ? { ...v, [field]: value } : v));
  const removeVariant = (i: number) =>
    setVariants((prev) => prev.filter((_, idx) => idx !== i));

  const totalPlanned = variants.reduce((s, v) => s + (v.plannedQuantity || 0), 0);
  const totalStock   = variants.reduce((s, v) => s + (v.stockQuantity   || 0), 0);
  const totalSold    = variants.reduce((s, v) => s + (v.soldQuantity    || 0), 0);
  const hasVariants  = variants.length > 0;

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
          {state.error}
        </div>
      )}

      {/* 基本情報 */}
      <section className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">基本情報</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500" htmlFor="name">
              商品名 <span className="text-red-500">*</span>
            </label>
            <input
              id="name" name="name" type="text" required
              defaultValue={defaultValues?.name ?? ""}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="例: 九州プロレス Tシャツ 2024"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500" htmlFor="category">
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <select
              id="category" name="category" required
              defaultValue={defaultValues?.category ?? ""}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">選択してください</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500" htmlFor="status">
              ステータス <span className="text-red-500">*</span>
            </label>
            <select
              id="status" name="status" required
              defaultValue={defaultValues?.status ?? "案出し中"}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500" htmlFor="salesChannel">
              販売チャネル
            </label>
            <select
              id="salesChannel" name="salesChannel"
              defaultValue={defaultValues?.salesChannel ?? "会場"}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {SALES_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500" htmlFor="priority">
              優先度
            </label>
            <select
              id="priority" name="priority"
              defaultValue={defaultValues?.priority ?? "未設定"}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500" htmlFor="releaseDate">
              発売月
            </label>
            <input
              id="releaseDate" name="releaseDate" type="month"
              defaultValue={defaultValues?.releaseDate ?? ""}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500" htmlFor="concept">
              コンセプト
            </label>
            <input
              id="concept" name="concept" type="text"
              defaultValue={defaultValues?.concept ?? ""}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="例: 九州の熱さをデザインに込めた定番Tシャツ"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500" htmlFor="target">
              ターゲット
            </label>
            <input
              id="target" name="target" type="text"
              defaultValue={defaultValues?.target ?? ""}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="例: ファン全般"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500" htmlFor="memo">
              メモ
            </label>
            <textarea
              id="memo" name="memo" rows={2}
              defaultValue={defaultValues?.memo ?? ""}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* 計画コスト */}
      <section className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">計画コスト（円）</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="block text-xs text-gray-500" htmlFor="budgetAmount">
              予算額
            </label>
            <input
              {...numInputProps("budgetAmount", b?.budgetAmount ?? 0)}
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none w-full sm:w-1/3"
            />
          </div>
          {(
            [
              { name: "designCost",        label: "デザイン費" },
              { name: "sampleCost",        label: "サンプル費" },
              { name: "manufacturingCost", label: "製造原価" },
              { name: "shippingCost",      label: "送料" },
              { name: "otherCost",         label: "その他経費" },
            ] as const
          ).map(({ name, label }) => (
            <div key={name}>
              <label className="block text-xs text-gray-500" htmlFor={name}>
                {label}
              </label>
              <input {...numInputProps(name, b?.[name] ?? 0)} />
            </div>
          ))}
        </div>
      </section>

      {/* バリエーション（カラー×サイズ） */}
      <section className="rounded border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">
              バリエーション（カラー×サイズ）
              <span className="ml-2 text-xs font-normal text-gray-400">任意</span>
            </h2>
            {hasVariants && (
              <p className="mt-0.5 text-xs text-gray-400">
                製作数・販売数は下の販売計画に自動反映されます
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setVariants((prev) => [...prev, newVariant()])}
            className="rounded border border-blue-300 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            + バリエーションを追加
          </button>
        </div>

        {hasVariants ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500">
                  <th className="pb-2 pr-2 text-left font-medium">カラー</th>
                  <th className="pb-2 pr-2 text-left font-medium">サイズ</th>
                  <th className="pb-2 pr-2 text-right font-medium">単価（円）</th>
                  <th className="pb-2 pr-2 text-right font-medium">原価（円）</th>
                  <th className="pb-2 pr-2 text-right font-medium">予定製作数</th>
                  <th className="pb-2 pr-2 text-right font-medium">在庫数</th>
                  <th className="pb-2 pr-2 text-right font-medium">販売数</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variants.map((v, i) => (
                  <tr key={v.id}>
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        list="color-options"
                        value={v.color}
                        onChange={(e) => updateVariant(i, "color", e.target.value)}
                        placeholder="例: ブラック"
                        className="w-28 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        value={v.size}
                        onChange={(e) => updateVariant(i, "size", e.target.value)}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">—</option>
                        {SIZE_OPTIONS.map((sz) => <option key={sz} value={sz}>{sz}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number" min="0" step="1"
                        value={v.sellingPrice ?? ""}
                        onChange={(e) => updateVariant(i, "sellingPrice", e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)))}
                        placeholder="—"
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number" min="0" step="1"
                        value={v.unitCost ?? ""}
                        onChange={(e) => updateVariant(i, "unitCost", e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)))}
                        placeholder="—"
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    {(["plannedQuantity", "stockQuantity", "soldQuantity"] as const).map((field) => (
                      <td key={field} className="py-1.5 pr-2">
                        <input
                          type="number" min="0" step="1"
                          value={v[field]}
                          onChange={(e) => updateVariant(i, field, Math.max(0, Number(e.target.value)))}
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                    ))}
                    <td className="py-1.5">
                      <button
                        type="button"
                        onClick={() => removeVariant(i)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t text-xs text-gray-600">
                  <td className="pt-2" colSpan={4}>合計</td>
                  <td className="pt-2 pr-2 text-right font-semibold">{totalPlanned}個</td>
                  <td className="pt-2 pr-2 text-right font-semibold">{totalStock}個</td>
                  <td className="pt-2 pr-2 text-right font-semibold">{totalSold}個</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <datalist id="color-options">
              {COLOR_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            カラーやサイズで在庫・製作数を管理する場合は「バリエーションを追加」してください。
            設定しない場合は販売計画に直接入力できます。
          </p>
        )}

        <input type="hidden" name="variants" value={JSON.stringify(variants)} />
      </section>

      {/* 販売計画 */}
      <section className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">販売計画</h2>
        <p className="mb-4 text-xs text-gray-400">
          {hasVariants
            ? "製作数・販売数はバリエーションから自動集計されます。"
            : "ここに入力する数値は計画値です。実績はAirレジから取り込みます。"}
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs text-gray-500" htmlFor="sellingPrice">
              予定販売価格（円）<span className="text-red-500">*</span>
            </label>
            <input {...numInputProps("sellingPrice", s?.sellingPrice ?? 0)} required />
          </div>
          <div>
            <label className="block text-xs text-gray-500">予定製作数（個）</label>
            {hasVariants ? (
              <>
                <p className="mt-1 rounded border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {totalPlanned}
                </p>
                <input type="hidden" name="productionCount" value={totalPlanned} />
              </>
            ) : (
              <input {...numInputProps("productionCount", s?.productionCount ?? 0)} />
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500">販売目標数（個）</label>
            {hasVariants ? (
              <>
                <p className="mt-1 rounded border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {totalSold}
                </p>
                <input type="hidden" name="salesCount" value={totalSold} />
              </>
            ) : (
              <>
                <input {...numInputProps("salesCount", s?.salesCount ?? 0)} />
                <p className="mt-0.5 text-xs text-gray-400">Airレジ連携後は実績を参照します</p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Airレジ連携 */}
      <section className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Airレジ連携</h2>
        <div>
          <label className="block text-xs text-gray-500" htmlFor="airregiProductCode">
            商品コード（Airレジ連携用）
          </label>
          <input
            id="airregiProductCode"
            name="airregiProductCode"
            type="text"
            defaultValue={defaultValues?.airregiProductCode ?? ""}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none sm:w-1/2"
            placeholder="例: KYP-001"
          />
          <p className="mt-1 text-xs text-gray-400">
            AirレジのCSV取込と突合するための商品コードです。Airレジ側の商品コードと完全一致させてください。
          </p>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <Link
          href={cancelHref}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 一覧に戻る
        </Link>
        <div className="flex gap-3">
          <Link
            href={cancelHref}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "保存中..." : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
