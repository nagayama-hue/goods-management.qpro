import { getAllWrestlers } from "@/lib/wrestlerStore";
import { getAllIncentiveRules } from "@/lib/incentiveRuleStore";
import IncentiveTabs from "../IncentiveTabs";
import { addRuleAction, deleteRuleAction } from "./actions";

export const metadata = { title: "インセンティブルール | 九州プロレス グッズ管理" };

interface Props {
  searchParams: Promise<{ saved?: string; error?: string }>;
}

const CHANNEL_LABELS: Record<string, string> = {
  venue: "会場販売", ec: "EC", hand: "手売り", all: "全チャネル",
};
const BASIS_LABELS: Record<string, string> = {
  sales: "売上額の%", profit: "粗利の%", fixed: "1個あたり定額",
};

export default async function IncentiveRulesPage({ searchParams }: Props) {
  const { saved, error } = await searchParams;
  const wrestlers = getAllWrestlers();
  const wrestlerName = (id: string | null) =>
    id === null ? "（全選手）" : wrestlers.find((w) => w.id === id)?.name ?? "（不明）";

  const rules = [...getAllIncentiveRules()].sort((a, b) => {
    const aw = a.wrestlerId ? 1 : 0, bw = b.wrestlerId ? 1 : 0;
    if (aw !== bw) return aw - bw;
    return a.startDate.localeCompare(b.startDate);
  });

  return (
    <div className="space-y-6">
      {saved && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ ルールを追加しました。
        </div>
      )}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error === "value" ? "率・金額は1以上を入力してください。" :
           error === "date" ? "適用開始日を入力してください。" :
           "入力内容が正しくありません。"}
        </div>
      )}

      <div>
        <h1 className="text-xl font-semibold text-gray-900">インセンティブ管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          計算ルールの一覧です。率の変更は削除ではなく「新しい適用開始日でルールを追加」してください（過去分の再計算ズレを防ぐため）。
        </p>
      </div>

      <IncentiveTabs active="/incentive/rules" />

      {/* 追加フォーム */}
      <form action={addRuleAction} className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">ルール追加</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-gray-500">選手
            <select name="wrestlerId" defaultValue="" className="mt-1 block rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none">
              <option value="">全選手（デフォルト）</option>
              {wrestlers.filter((w) => w.active).map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-500">チャネル
            <select name="channel" defaultValue="all" className="mt-1 block rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none">
              {Object.entries(CHANNEL_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-500">計算基準
            <select name="basis" defaultValue="sales" className="mt-1 block rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none">
              {Object.entries(BASIS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-500">率（%）／定額（円/個）
            <input name="value" type="number" min="1" step="1" defaultValue={5} className="mt-1 block w-28 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none" />
          </label>
          <label className="text-xs text-gray-500">適用開始日
            <input name="startDate" type="date" className="mt-1 block rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none" />
          </label>
          <label className="text-xs text-gray-500">メモ
            <input name="note" type="text" className="mt-1 block w-48 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none" />
          </label>
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            追加
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          優先順位: 選手個別 ＞ 全選手デフォルト ／ チャネル個別 ＞ 全チャネル ／ 同条件なら適用開始日が新しいルール。過去の売上には当時のルールが適用されます。
        </p>
      </form>

      {/* 一覧 */}
      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs text-gray-500">
              <th className="px-4 py-3 text-left font-medium">選手</th>
              <th className="px-4 py-3 text-left font-medium">チャネル</th>
              <th className="px-4 py-3 text-left font-medium">計算基準</th>
              <th className="px-4 py-3 text-right font-medium">値</th>
              <th className="px-4 py-3 text-left font-medium">適用開始日</th>
              <th className="px-4 py-3 text-left font-medium">メモ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rules.map((r) => (
              <tr key={r.id}>
                <td className={`px-4 py-3 ${r.wrestlerId ? "font-medium text-gray-800" : "text-gray-500"}`}>
                  {wrestlerName(r.wrestlerId)}
                </td>
                <td className="px-4 py-3 text-gray-700">{CHANNEL_LABELS[r.channel]}</td>
                <td className="px-4 py-3 text-gray-700">{BASIS_LABELS[r.basis]}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-800">
                  {r.basis === "fixed" ? `¥${r.value.toLocaleString()}` : `${r.value}%`}
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-600">{r.startDate}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{r.note ?? ""}</td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteRuleAction} className="inline">
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="text-xs text-red-500 hover:underline">削除</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
