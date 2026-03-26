"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Goods, GoodsStatus, GoodsCategory, SalesChannel, Priority } from "@/types/goods";

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

export default function GoodsForm({ defaultValues, action, submitLabel, cancelHref }: Props) {
  const [state, formAction, isPending] = useActionState(action, null);
  const b = defaultValues?.budget;
  const s = defaultValues?.sales;

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

      {/* 販売計画 */}
      <section className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">販売計画</h2>
        <p className="mb-4 text-xs text-gray-400">
          ここに入力する数値は計画値です。実績はAirレジから取り込みます。
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs text-gray-500" htmlFor="sellingPrice">
              予定販売価格（円）<span className="text-red-500">*</span>
            </label>
            <input {...numInputProps("sellingPrice", s?.sellingPrice ?? 0)} required />
          </div>
          <div>
            <label className="block text-xs text-gray-500" htmlFor="productionCount">
              予定製作数（個）
            </label>
            <input {...numInputProps("productionCount", s?.productionCount ?? 0)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500" htmlFor="salesCount">
              販売目標数（個）
            </label>
            <input {...numInputProps("salesCount", s?.salesCount ?? 0)} />
            <p className="mt-0.5 text-xs text-gray-400">Airレジ連携後は実績を参照します</p>
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
