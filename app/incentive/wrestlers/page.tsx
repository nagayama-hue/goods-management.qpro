import Link from "next/link";
import { getAllWrestlers } from "@/lib/wrestlerStore";
import { getAllGoodsIncentives } from "@/lib/goodsIncentiveStore";
import { addWrestlerAction, toggleWrestlerActiveAction } from "./actions";

export const metadata = { title: "選手マスタ | 九州プロレス グッズ管理" };

interface Props {
  searchParams: Promise<{ saved?: string; error?: string }>;
}

export default async function WrestlersPage({ searchParams }: Props) {
  const { saved, error } = await searchParams;

  const wrestlers = getAllWrestlers();
  const incentives = getAllGoodsIncentives();
  const linkedCount = (wrestlerId: string) =>
    incentives.filter((x) => x.links.some((l) => l.wrestlerId === wrestlerId)).length;

  return (
    <div className="space-y-6">
      {saved && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ 選手を追加しました。
        </div>
      )}
      {error === "duplicate" && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          同じ名前の選手が既に登録されています。
        </div>
      )}
      {error === "empty" && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          選手名を入力してください。
        </div>
      )}

      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">インセンティブ管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          選手マスタです。退団は削除ではなくフラグ管理で、過去のインセンティブ実績を保持します。
        </p>
      </div>

      {/* タブナビ */}
      <div className="flex gap-1 border-b border-gray-200">
        <Link href="/incentive/links" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800">商品×選手 紐付け</Link>
        <span className="border-b-2 border-gray-900 px-4 py-2 text-sm font-medium text-gray-900">選手マスタ</span>
      </div>

      {/* 追加フォーム */}
      <form action={addWrestlerAction} className="flex items-center gap-2 rounded border border-gray-200 bg-white px-4 py-3">
        <input
          type="text"
          name="name"
          placeholder="選手名"
          className="w-64 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          ＋ 選手を追加
        </button>
      </form>

      {/* 一覧 */}
      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs text-gray-500">
              <th className="px-4 py-3 text-left font-medium">選手名</th>
              <th className="px-4 py-3 text-left font-medium">状態</th>
              <th className="px-4 py-3 text-right font-medium">紐付き商品数</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {wrestlers.map((w) => (
              <tr key={w.id} className={w.active ? "" : "bg-gray-50"}>
                <td className={`px-4 py-3 font-medium ${w.active ? "text-gray-800" : "text-gray-400"}`}>
                  {w.name}
                </td>
                <td className="px-4 py-3">
                  {w.active ? (
                    <span className="rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-700">現役</span>
                  ) : (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">退団（実績保持）</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                  {linkedCount(w.id)}件
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={toggleWrestlerActiveAction} className="inline">
                    <input type="hidden" name="id" value={w.id} />
                    <button
                      type="submit"
                      className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      {w.active ? "退団にする" : "現役に戻す"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        ※ 報酬情報を扱う機能のため、共有範囲に注意してください（認証・閲覧権限は Phase 5 で対応予定）。
      </p>
    </div>
  );
}
