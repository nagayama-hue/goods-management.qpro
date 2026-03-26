import Link from "next/link";
import { createEventAction } from "./actions";

const inputClass =
  "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function NewEventPage() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">大会・イベントを登録</h1>
          <p className="mt-1 text-sm text-gray-500">新しい大会またはイベントを追加します。</p>
        </div>
        <Link href="/events" className="shrink-0 text-sm text-gray-400 hover:text-gray-700">
          ← 一覧に戻る
        </Link>
      </div>

      <form action={createEventAction} className="space-y-5">
        <div className="rounded border border-gray-200 bg-white p-5 space-y-4">
          {/* 種別 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              種別 <span className="text-red-500">*</span>
            </label>
            <select name="type" required className={inputClass}>
              <option value="主催大会">主催大会</option>
              <option value="イベント">イベント</option>
            </select>
          </div>

          {/* 日付 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              日付 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date"
              required
              defaultValue={today}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              日程未定の場合は月初などの仮日程を入力してください。
            </p>
          </div>

          {/* 名称 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              大会・イベント名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="例：熊本大会、イオン大牟田"
              className={inputClass}
            />
          </div>

          {/* 動員目標 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              動員目標（人）
            </label>
            <input
              type="number"
              name="capacity"
              min={0}
              step={100}
              placeholder="例：800"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">主催大会のみ。イベントは空欄で問題ありません。</p>
          </div>

          {/* 売上目標 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              売上目標（円） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="target"
              required
              min={0}
              step={100}
              placeholder="例：346700"
              className={`${inputClass} text-right tabular-nums`}
            />
          </div>

          {/* メモ */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">メモ（任意）</label>
            <textarea
              name="memo"
              rows={2}
              placeholder="補足メモ"
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            登録する
          </button>
          <Link href="/events" className="text-sm text-gray-500 hover:text-gray-700">
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
