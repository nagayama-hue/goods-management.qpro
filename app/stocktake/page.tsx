import Link from "next/link";
import { getAllStocktakes, getDraftStocktake } from "@/lib/stocktakeStore";
import { getAllGoods } from "@/lib/store";
import { startStocktakeAction, discardStocktakeAction } from "./actions";

export const metadata = { title: "棚卸し | 九州プロレス グッズ管理" };

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function StocktakePage({ searchParams }: Props) {
  const { error } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  const draft = getDraftStocktake();
  const history = getAllStocktakes()
    .filter((s) => s.status === "confirmed")
    .sort((a, b) => (b.confirmedAt ?? "").localeCompare(a.confirmedAt ?? ""));

  // 対象件数の目安（案出し中・検討中を除く商品のバリエーション数）
  const activeVariantCount = getAllGoods()
    .filter((g) => !["案出し中", "検討中"].includes(g.status))
    .reduce((s, g) => s + (g.variants?.length ?? 0), 0);

  return (
    <div className="space-y-6">
      {error === "staff" && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          担当者名を入力してください。
        </div>
      )}
      {error === "draft" && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          進行中の棚卸しがあります。先に確定するか破棄してください。
        </div>
      )}
      {error === "empty" && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          対象となる商品がありません。
        </div>
      )}

      <div>
        <h1 className="text-xl font-semibold text-gray-900">棚卸し</h1>
        <p className="mt-1 text-sm text-gray-500">
          実際に数えた個数を入力して、システム在庫との差異を記録します。スマホ・タブレットからも入力できます。
        </p>
      </div>

      {/* 進行中 */}
      {draft ? (
        <section className="rounded border border-blue-300 bg-blue-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-blue-700">進行中の棚卸し</p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {draft.date}　担当: {draft.staff}
              </p>
              <p className="mt-0.5 text-sm text-gray-600 tabular-nums">
                {draft.lines.filter((l) => l.actual !== undefined).length} / {draft.lines.length} 件 入力済み
                <span className="ml-2 text-xs text-gray-400">
                  最終保存: {new Date(draft.updatedAt).toLocaleString("ja-JP")}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <form action={discardStocktakeAction}>
                <input type="hidden" name="id" value={draft.id} />
                <button
                  type="submit"
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  破棄
                </button>
              </form>
              <Link
                href={`/stocktake/${draft.id}`}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                続きから入力
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">棚卸しを開始</h2>
          <form action={startStocktakeAction} className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-gray-500">
              実施日
              <input
                type="date"
                name="date"
                defaultValue={today}
                className="mt-1 block rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </label>
            <label className="text-xs text-gray-500">
              担当者 <span className="text-red-500">*</span>
              <input
                type="text"
                name="staff"
                placeholder="例: 永山"
                className="mt-1 block w-40 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </label>
            <label className="text-xs text-gray-500">
              対象商品
              <select
                name="scope"
                defaultValue="active"
                className="mt-1 block rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="active">販売中・制作中など（{activeVariantCount}件）</option>
                <option value="all">全商品（案出し中・検討中も含む）</option>
              </select>
            </label>
            <button
              type="submit"
              className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              棚卸しを開始
            </button>
          </form>
          <div className="mt-4 rounded border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-800">
            <p className="font-semibold">開始前の確認</p>
            <ul className="mt-1 space-y-0.5">
              <li>・棚卸し中に売上・出庫を登録すると数が合わなくなります。数え終わって確定するまで、登録は控えてください</li>
              <li>・確定すると入力した実数がそのまま在庫になります。念のため事前にデータのバックアップを取ってください</li>
            </ul>
          </div>
        </section>
      )}

      {/* 履歴 */}
      <section className="rounded border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">棚卸し履歴</h2>
        {history.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">確定済みの棚卸しはまだありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500">
                  <th className="px-3 py-2 text-left font-medium">実施日</th>
                  <th className="px-3 py-2 text-left font-medium">担当</th>
                  <th className="px-3 py-2 text-right font-medium">棚卸し件数</th>
                  <th className="px-3 py-2 text-right font-medium">差異あり</th>
                  <th className="px-3 py-2 text-right font-medium">差異合計</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((s) => {
                  const entered = s.lines.filter((l) => l.actual !== undefined);
                  const diffs = entered.filter((l) => (l.actual as number) - l.theoretical !== 0);
                  const total = diffs.reduce((acc, l) => acc + ((l.actual as number) - l.theoretical), 0);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 tabular-nums text-gray-700">{s.date}</td>
                      <td className="px-3 py-2 text-gray-700">{s.staff}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">{entered.length}件</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${diffs.length > 0 ? "text-orange-600" : "text-gray-400"}`}>
                        {diffs.length}件
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums ${total === 0 ? "text-gray-400" : total > 0 ? "text-blue-600" : "text-red-600"}`}>
                        {total > 0 ? "+" : ""}{total}個
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link href={`/stocktake/${s.id}`} className="text-xs text-blue-600 hover:underline">
                          結果を見る
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
