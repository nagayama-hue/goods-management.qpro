import Link from "next/link";
import { getAllSalesRecords } from "@/lib/salesRecordStore";
import { formatCurrency } from "@/lib/format";

interface Props {
  searchParams: Promise<{ event?: string; goods?: string }>;
}

export default async function SalesRecordsPage({ searchParams }: Props) {
  const { event: eventFilter, goods: goodsFilter } = await searchParams;

  const all = getAllSalesRecords().sort((a, b) => {
    const dateDiff = b.saleDate.localeCompare(a.saleDate);
    return dateDiff !== 0 ? dateDiff : b.createdAt.localeCompare(a.createdAt);
  });

  // 絞り込み
  const records = all.filter((r) => {
    if (eventFilter && !(r.eventName ?? r.location).includes(eventFilter)) return false;
    if (goodsFilter && !r.goodsName.includes(goodsFilter)) return false;
    return true;
  });

  // 絞り込み用の選択肢（全レコードから重複排除）
  const eventNames = [...new Set(all.map((r) => r.eventName ?? r.location).filter(Boolean))].sort();
  const goodsNames = [...new Set(all.map((r) => r.goodsName).filter(Boolean))].sort();

  const totalRevenue    = records.reduce((s, r) => s + r.revenue, 0);
  const totalGrossProfit = records.reduce((s, r) => s + r.grossProfit, 0);
  const totalQuantity   = records.reduce((s, r) => s + r.quantity, 0);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">売上実績一覧</h1>
          <p className="mt-1 text-sm text-gray-500">
            登録済みの物販売上実績です。大会・商品ごとに絞り込めます。
          </p>
        </div>
        {records.length > 0 && (
          <a
            href={`/api/sales/export${eventFilter || goodsFilter ? `?${new URLSearchParams({ ...(eventFilter ? { event: eventFilter } : {}), ...(goodsFilter ? { goods: goodsFilter } : {}) }).toString()}` : ""}`}
            className="flex-shrink-0 rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            CSVダウンロード
          </a>
        )}
      </div>

      {/* 絞り込みフォーム */}
      <form method="GET" className="flex flex-wrap items-end gap-3 rounded border border-gray-200 bg-white p-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1" htmlFor="event">
            大会・販売場所
          </label>
          <select
            id="event"
            name="event"
            defaultValue={eventFilter ?? ""}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">すべて</option>
            {eventNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1" htmlFor="goods">
            商品名
          </label>
          <select
            id="goods"
            name="goods"
            defaultValue={goodsFilter ?? ""}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">すべて</option>
            {goodsNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            絞り込む
          </button>
          {(eventFilter || goodsFilter) && (
            <Link
              href="/sales"
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
            >
              リセット
            </Link>
          )}
        </div>
      </form>

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

      {/* 実績テーブル */}
      {records.length === 0 ? (
        <div className="rounded border border-dashed border-gray-300 py-20 text-center text-sm text-gray-400">
          {all.length === 0
            ? <>
                売上実績がまだ登録されていません。
                <br />
                <Link href="/events" className="mt-2 inline-block text-green-600 hover:underline">
                  大会管理から物販実績を入力する →
                </Link>
              </>
            : "絞り込み条件に一致する実績がありません。"
          }
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500">
                <th className="px-4 py-3 text-left font-medium">販売日</th>
                <th className="px-4 py-3 text-left font-medium">チャネル</th>
                <th className="px-4 py-3 text-left font-medium">大会・販売場所</th>
                <th className="px-4 py-3 text-left font-medium">商品名</th>
                <th className="px-4 py-3 text-left font-medium">カラー</th>
                <th className="px-4 py-3 text-left font-medium">サイズ</th>
                <th className="px-4 py-3 text-right font-medium">数量</th>
                <th className="px-4 py-3 text-right font-medium">単価</th>
                <th className="px-4 py-3 text-right font-medium">売上</th>
                <th className="px-4 py-3 text-right font-medium">粗利</th>
                <th className="px-4 py-3 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-gray-600">
                    {r.saleDate}
                  </td>
                  <td className="px-4 py-3">
                    {(!r.channel || r.channel === "event") && (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">大会</span>
                    )}
                    {r.channel === "ec" && (
                      <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">EC</span>
                    )}
                    {r.channel === "other" && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">単独</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {r.eventId ? (
                      <Link
                        href={`/events/${r.eventId}`}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {r.eventName ?? r.location}
                      </Link>
                    ) : (
                      r.location
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <Link
                      href={`/goods/${r.goodsId}`}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {r.goodsName}
                    </Link>
                    {r.saleType && r.saleType !== "normal" && (
                      <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-medium ${
                        r.saleType === "campaign" ? "bg-orange-100 text-orange-700" :
                        r.saleType === "bundle"   ? "bg-teal-100 text-teal-700" :
                        "bg-red-100 text-red-600"
                      }`}>
                        {r.saleType === "campaign" ? r.campaignName || "企画" :
                         r.saleType === "bundle"   ? "セット" : "値引き"}
                      </span>
                    )}
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
                      <Link
                        href={`/sales/${r.id}/edit?from=/sales`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        編集
                      </Link>
                      <Link
                        href={`/sales/${r.id}/delete?from=/sales`}
                        className="text-xs text-red-500 hover:underline"
                      >
                        削除
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-gray-50 text-xs font-semibold text-gray-700">
                <td className="px-4 py-3" colSpan={6}>合計（{records.length}件）</td>
                <td className="px-4 py-3 text-right tabular-nums">{totalQuantity}個</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totalRevenue)}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${totalGrossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {formatCurrency(totalGrossProfit)}
                </td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
