import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupplierById } from "@/lib/supplierStore";
import { updateSupplierAction } from "./actions";
import {
  SUPPLIER_GENRES,
  PRICE_SENSE_OPTIONS,
  DELIVERY_SPEED_OPTIONS,
  QUALITY_LEVEL_OPTIONS,
} from "@/types/supplier";

interface Props {
  params: Promise<{ id: string }>;
}

const inputClass =
  "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default async function EditSupplierPage({ params }: Props) {
  const { id } = await params;
  const s = getSupplierById(id);
  if (!s) notFound();

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">取引先を編集</h1>
          <p className="mt-1 text-sm text-gray-500">{s.name}</p>
        </div>
        <Link href={`/suppliers/${s.id}`} className="shrink-0 text-sm text-gray-400 hover:text-gray-700">
          ← 詳細に戻る
        </Link>
      </div>

      <form action={updateSupplierAction} className="space-y-5">
        <input type="hidden" name="id" value={s.id} />

        <div className="rounded border border-gray-200 bg-white p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">基本情報</p>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              取引先名 <span className="text-red-500">*</span>
            </label>
            <input type="text" name="name" required defaultValue={s.name} className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">担当者名</label>
            <input
              type="text"
              name="contactName"
              defaultValue={s.contactName ?? ""}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">電話番号</label>
              <input type="tel" name="phone" defaultValue={s.phone ?? ""} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">メールアドレス</label>
              <input
                type="email"
                name="email"
                defaultValue={s.email ?? ""}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="rounded border border-gray-200 bg-white p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">実務情報</p>

          {/* 対応ジャンル */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">対応ジャンル</label>
            <div className="flex flex-wrap gap-3">
              {SUPPLIER_GENRES.map((g) => (
                <label key={g} className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name={`genre_${g}`}
                    defaultChecked={s.genres.includes(g)}
                    className="rounded"
                  />
                  {g}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                価格感 <span className="text-red-500">*</span>
              </label>
              <select name="priceSense" required defaultValue={s.priceSense} className={inputClass}>
                {PRICE_SENSE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                品質 <span className="text-red-500">*</span>
              </label>
              <select name="quality" required defaultValue={s.quality} className={inputClass}>
                {QUALITY_LEVEL_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                納期感 <span className="text-red-500">*</span>
              </label>
              <select
                name="deliverySpeed"
                required
                defaultValue={s.deliverySpeed}
                className={inputClass}
              >
                {DELIVERY_SPEED_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                納期目安（日）
              </label>
              <input
                type="number"
                name="deliveryDays"
                min={1}
                step={1}
                defaultValue={s.deliveryDays ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">最低ロット（個）</label>
              <input
                type="number"
                name="minLot"
                min={1}
                step={1}
                defaultValue={s.minLot ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                評価（1〜5） <span className="text-red-500">*</span>
              </label>
              <select
                name="rating"
                required
                defaultValue={s.rating}
                className={inputClass}
              >
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <option key={n} value={n}>
                    {"★".repeat(n)}{"☆".repeat(5 - n)} （{n}）
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">メモ</label>
            <textarea
              name="memo"
              rows={3}
              defaultValue={s.memo ?? ""}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            保存する
          </button>
          <Link href={`/suppliers/${s.id}`} className="text-sm text-gray-500 hover:text-gray-700">
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
