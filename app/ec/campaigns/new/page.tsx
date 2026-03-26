import Link from "next/link";
import { createCampaignAction } from "./actions";
import { EC_CAMPAIGN_TYPES } from "@/types/ecCampaign";

// 対象月の選択肢：2025-10 〜 2027-03
const MONTH_OPTIONS: string[] = [];
for (let y = 2025; y <= 2027; y++) {
  for (let m = 1; m <= 12; m++) {
    const ym = `${y}-${String(m).padStart(2, "0")}`;
    if (ym >= "2025-10" && ym <= "2027-03") MONTH_OPTIONS.push(ym);
  }
}

function formatMonthOption(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

export default function NewCampaignPage() {
  const defaultMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/ec/campaigns" className="text-sm text-gray-400 hover:text-gray-600">
          ← EC企画一覧
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-gray-900">EC企画を新規登録</h1>
      </div>

      <form
        action={createCampaignAction}
        className="max-w-lg space-y-5 rounded border border-gray-200 bg-white p-6"
      >
        {/* 種別 */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            種別 <span className="text-red-500">*</span>
          </label>
          <select
            name="type"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            {EC_CAMPAIGN_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* 企画名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            企画名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            placeholder="例：2026夏のTシャツ特集"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        {/* 対象月 */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            対象月 <span className="text-red-500">*</span>
          </label>
          <select
            name="targetMonth"
            required
            defaultValue={defaultMonth}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            {MONTH_OPTIONS.map((ym) => (
              <option key={ym} value={ym}>{formatMonthOption(ym)}</option>
            ))}
          </select>
        </div>

        {/* 売上目標 */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            売上目標（円） <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="target"
            required
            min={0}
            step={1000}
            placeholder="例：200000"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        {/* メモ */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            メモ <span className="text-xs font-normal text-gray-400">（任意）</span>
          </label>
          <textarea
            name="memo"
            rows={2}
            placeholder="例：春日選手コラボ、受注期間3週間"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            className="rounded bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            登録する
          </button>
          <Link
            href="/ec/campaigns"
            className="rounded border border-gray-300 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
