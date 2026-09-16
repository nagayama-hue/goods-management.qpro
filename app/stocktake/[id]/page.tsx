import { notFound } from "next/navigation";
import Link from "next/link";
import { getStocktakeById } from "@/lib/stocktakeStore";
import { saveDraftAction, confirmStocktakeAction } from "./actions";
import StocktakeForm from "./StocktakeForm";

export const metadata = { title: "棚卸し | 九州プロレス グッズ管理" };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ confirmed?: string }>;
}

function variantLabel(color: string, size: string): string {
  return [color, size].filter(Boolean).join(" / ") || "—";
}

export default async function StocktakeDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { confirmed } = await searchParams;

  const stocktake = getStocktakeById(id);
  if (!stocktake) notFound();

  // 下書き中は入力画面
  if (stocktake.status === "draft") {
    return (
      <div className="space-y-4">
        <div>
          <Link href="/stocktake" className="text-sm text-gray-400 hover:text-gray-600">
            ← 棚卸し一覧
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">棚卸し入力</h1>
          <p className="mt-1 text-sm text-gray-500">
            実際に数えた個数を入力してください。確定するまで在庫は変わりません。
          </p>
        </div>
        <StocktakeForm
          stocktakeId={stocktake.id}
          date={stocktake.date}
          staff={stocktake.staff}
          lines={stocktake.lines}
          updatedAt={stocktake.updatedAt}
          saveAction={saveDraftAction}
          confirmAction={confirmStocktakeAction}
        />
      </div>
    );
  }

  // 確定済みは結果レポート
  const entered = stocktake.lines.filter((l) => l.actual !== undefined);
  const diffLines = entered
    .filter((l) => (l.actual as number) - l.theoretical !== 0)
    .sort((a, b) =>
      Math.abs((b.actual as number) - b.theoretical) - Math.abs((a.actual as number) - a.theoretical)
    );
  const diffTotal = diffLines.reduce((s, l) => s + ((l.actual as number) - l.theoretical), 0);
  const skipped = stocktake.lines.length - entered.length;

  return (
    <div className="space-y-6">
      {confirmed && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ 棚卸しを確定し、在庫に反映しました。
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/stocktake" className="text-sm text-gray-400 hover:text-gray-600">
            ← 棚卸し一覧
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">棚卸し結果</h1>
          <p className="mt-1 text-sm text-gray-500">
            {stocktake.date}　担当: {stocktake.staff}
            {stocktake.confirmedAt && `　確定: ${new Date(stocktake.confirmedAt).toLocaleString("ja-JP")}`}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/stocktake/export?id=${stocktake.id}&mode=diff`}
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            差異CSV
          </a>
          <a
            href={`/api/stocktake/export?id=${stocktake.id}`}
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            全件CSV
          </a>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">棚卸し件数</p>
          <p className="mt-1 text-lg font-bold text-gray-900 tabular-nums">{entered.length}件</p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">差異あり</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${diffLines.length > 0 ? "text-orange-600" : "text-gray-400"}`}>
            {diffLines.length}件
          </p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">差異合計</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${diffTotal === 0 ? "text-gray-400" : diffTotal > 0 ? "text-blue-600" : "text-red-600"}`}>
            {diffTotal > 0 ? "+" : ""}{diffTotal}個
          </p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">未入力（在庫据置）</p>
          <p className="mt-1 text-lg font-bold text-gray-500 tabular-nums">{skipped}件</p>
        </div>
      </div>

      {/* 差異一覧 */}
      <section className="rounded border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          差異のあった商品
          <span className="ml-2 text-xs font-normal text-gray-400">差異の大きい順</span>
        </h2>
        {diffLines.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">差異はありませんでした。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500">
                  <th className="px-3 py-2 text-left font-medium">商品名</th>
                  <th className="px-3 py-2 text-left font-medium">カラー / サイズ</th>
                  <th className="px-3 py-2 text-right font-medium">システム在庫</th>
                  <th className="px-3 py-2 text-right font-medium">実数</th>
                  <th className="px-3 py-2 text-right font-medium">差異</th>
                  <th className="px-3 py-2 text-left font-medium">理由</th>
                  <th className="px-3 py-2 text-left font-medium">メモ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {diffLines.map((l) => {
                  const diff = (l.actual as number) - l.theoretical;
                  return (
                    <tr key={`${l.goodsId}|${l.variantId}`}>
                      <td className="px-3 py-2 text-gray-800">
                        <Link href={`/goods/${l.goodsId}`} className="hover:text-blue-600 hover:underline">
                          {l.goodsName}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{variantLabel(l.color, l.size)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">{l.theoretical}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-900">{l.actual}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-bold ${diff > 0 ? "text-blue-600" : "text-red-600"}`}>
                        {diff > 0 ? "+" : ""}{diff}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {l.reason ?? <span className="text-orange-500">未記入</span>}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{l.memo ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-gray-400">
        ※ 棚卸しは在庫数（stockQuantity）のみ更新し、販売数・売上実績は変更していません。
        差異の理由が「売上登録漏れ」「出庫登録漏れ」の場合は、該当の売上・出庫を別途登録すると記録が正確になります。
      </p>
    </div>
  );
}
