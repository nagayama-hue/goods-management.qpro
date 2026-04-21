import Link from "next/link";
import { getAllSalesRecords } from "@/lib/salesRecordStore";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "EC売上一覧 | 九州プロレス グッズ管理" };

interface Props {
  searchParams: Promise<{ saved?: string }>;
}

export default async function EcSalesPage({ searchParams }: Props) {
  const { saved } = await searchParams;

  const records = getAllSalesRecords()
    .filter((r) => r.channel === "ec")
    .sort((a, b) => {
      const d = b.saleDate.localeCompare(a.saleDate);
      return d !== 0 ? d : b.createdAt.localeCompare(a.createdAt);
    });

  const totalRevenue     = records.reduce((s, r) => s + r.revenue, 0);
  const totalGrossProfit = records.reduce((s, r) => s + r.grossProfit, 0);
  const totalQuantity    = records.reduce((s, r) => s + r.quantity, 0);

  return (
    <div className="space-y-6">
      {saved && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ EC売上を登録しました。
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">EC売上一覧</h1>
          <p className="mt-1 text-sm text-gray-500">
            ECサイトで販売した商品の売上実績です。
          </p>
        </div>
        <Link
          href="/ec/sales/new"
          className="flex-shrink-0 rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          ＋ EC売上を登録
        </Link>
      </div>

      {/* タブナビ */}
      <div className="flex gap-1 border-b border-gray-200">
        <Link href="/ec"           className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800">予算管理表</Link>
        <Link href="/ec/campaigns" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800">企画管理</Link>
        <Link href="/ec/results"   className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800">実績管理</Link>
        <span className="border-b-2 border-gray-900 px-4 py-2 text-sm font-medium text-gray-900">売上明細</span>
      </div>

      {/* サマリー */}
      {records.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          <div className="rounded border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">件数</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{records.length}件</p>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">販売個数</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{totalQuantity.toLocaleString()}個</p>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">売上合計</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">粗利合計</p>
            <p className={`mt-1 text-lg font-bold ${totalGrossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
              {formatCurrency(totalGrossProfit)}
            </p>
          </div>
        </div>
      )}

      {/* テーブル */}
      {records.length === 0 ? (
        <div className="rounded border border-dashed border-gray-300 py-20 text-center text-sm text-gray-400">
          EC売上実績がまだ登録されていません。
          <br />
          <Link href="/ec/sales/new" className="mt-2 inline-block text-purple-600 hover:underline">
            ＋ EC売上を登録する
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500">
                <th className="px-4 py-3 text-left font-medium">販売日</th>
                <th className="px-4 py-3 text-left font-medium">販売場所</th>
                <th className="px-4 py-3 text-left font-medium">商品名</th>
                <th className="px-4 py-3 text-left font-medium">カラー</th>
                <th className="px-4 py-3 text-left font-medium">サイズ</th>
                <th className="px-4 py-3 text-right font-medium">数量</th>
                <th className="px-4 py-3 text-right font-medium">単価</th>
                <th className="px-4 py-3 text-right font-medium">売上</th>
                <th className="px-4 py-3 text-right font-medium">粗利</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-gray-600">{r.saleDate}</td>
                  <td className="px-4 py-3 text-gray-700">{r.location}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <Link href={`/goods/${r.goodsId}`} className="hover:text-blue-600 hover:underline">
                      {r.goodsName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.color ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{r.size ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{r.quantity}個</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">{formatCurrency(r.sellingPrice)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-800">{formatCurrency(r.revenue)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${r.grossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {formatCurrency(r.grossProfit)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex gap-3">
                      <Link href={`/sales/${r.id}/edit?from=/ec/sales`} className="text-xs text-blue-600 hover:underline">編集</Link>
                      <Link href={`/sales/${r.id}/delete?from=/ec/sales`} className="text-xs text-red-500 hover:underline">削除</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-gray-50 text-xs font-semibold text-gray-700">
                <td className="px-4 py-3" colSpan={5}>合計（{records.length}件）</td>
                <td className="px-4 py-3 text-right tabular-nums">{totalQuantity}個</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totalRevenue)}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${totalGrossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {formatCurrency(totalGrossProfit)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
