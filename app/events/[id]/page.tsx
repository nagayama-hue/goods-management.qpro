import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventById } from "@/lib/eventStore";
import { getSalesRecordsByEvent } from "@/lib/salesRecordStore";
import { formatCurrency } from "@/lib/format";
import type { EventType } from "@/types/event";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}

const TYPE_BADGE: Record<EventType, string> = {
  "主催大会": "bg-blue-100 text-blue-700",
  "イベント": "bg-orange-100 text-orange-700",
};

export default async function EventDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { saved } = await searchParams;

  const event = getEventById(id);
  if (!event) notFound();

  const salesRecords = getSalesRecordsByEvent(id);
  const merchandiseRevenue   = salesRecords.reduce((s, r) => s + r.revenue, 0);
  const totalGrossProfit     = salesRecords.reduce((s, r) => s + r.grossProfit, 0);
  const totalQuantity        = salesRecords.reduce((s, r) => s + r.quantity, 0);

  // その他売上（手動入力）+ 物販売上（自動集計）= 大会総売上
  const otherRevenue  = event.actual ?? 0;
  const totalRevenue  = merchandiseRevenue + otherRevenue;
  const hasAnyRevenue = merchandiseRevenue > 0 || event.actual !== undefined;

  // 達成率は「大会総売上」対「目標」で計算
  const achievePct = event.target > 0 && hasAnyRevenue
    ? Math.round((totalRevenue / event.target) * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* 保存完了バナー */}
      {saved === "sale" && (
        <div className="rounded bg-green-50 px-4 py-3 text-sm text-green-700 border border-green-200">
          物販実績を登録しました。バリエーションの在庫・販売数が更新されました。
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/events" className="text-sm text-gray-400 hover:text-gray-600">
            ← 大会一覧に戻る
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">{event.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_BADGE[event.type]}`}>
              {event.type}
            </span>
            <span className="text-sm text-gray-500">{event.date}</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/events/${id}/sales/new`}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            ＋ 物販実績を入力
          </Link>
          <Link
            href={`/events/${id}/edit`}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            編集
          </Link>
        </div>
      </div>

      {/* 大会サマリー */}
      {/* 売上サマリー */}
      <div className="rounded border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* 大会総売上（メインKPI） */}
          <div className="sm:col-span-2 rounded border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-500">大会総売上</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {hasAnyRevenue ? formatCurrency(totalRevenue) : <span className="text-gray-300 text-lg">未入力</span>}
            </p>
            {achievePct !== null && (
              <p className={`mt-1 text-sm font-semibold ${achievePct >= 100 ? "text-green-600" : achievePct >= 80 ? "text-blue-600" : "text-orange-500"}`}>
                目標比 {achievePct}%
                <span className="ml-1 text-xs font-normal text-gray-400">（目標 {formatCurrency(event.target)}）</span>
              </p>
            )}
            {!hasAnyRevenue && (
              <p className="mt-1 text-xs text-gray-400">目標 {formatCurrency(event.target)}</p>
            )}
          </div>

          {/* 物販売上（自動） */}
          <div className="p-1">
            <p className="text-xs text-gray-500">
              物販売上
              <span className="ml-1 text-gray-400">自動集計</span>
            </p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {salesRecords.length > 0 ? formatCurrency(merchandiseRevenue) : <span className="text-gray-300 text-base">—</span>}
            </p>
            {salesRecords.length > 0 && (
              <p className="mt-0.5 text-xs text-gray-400">{totalQuantity}個販売</p>
            )}
          </div>

          {/* その他売上（手動） */}
          <div className="p-1">
            <p className="text-xs text-gray-500">
              その他売上
              <span className="ml-1 text-gray-400">入場料等・手入力</span>
            </p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {event.actual !== undefined ? formatCurrency(event.actual) : <span className="text-gray-300 text-base">未入力</span>}
            </p>
          </div>
        </div>
      </div>

      {/* 動員 + メモ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">売上目標</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(event.target)}</p>
        </div>
        {event.capacity !== undefined && (
          <div className="rounded border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">動員目標</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{event.capacity.toLocaleString()}人</p>
          </div>
        )}
        {event.actualCapacity !== undefined && (
          <div className="rounded border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">実績動員</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{event.actualCapacity.toLocaleString()}人</p>
          </div>
        )}
        {event.memo && (
          <div className="rounded border border-gray-200 bg-white p-4 sm:col-span-2">
            <p className="text-xs text-gray-500">メモ</p>
            <p className="mt-1 text-sm text-gray-700">{event.memo}</p>
          </div>
        )}
      </div>

      {/* 物販実績セクション */}
      <section className="rounded border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">物販実績</h2>
          <Link
            href={`/events/${id}/sales/new`}
            className="rounded border border-green-300 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
          >
            ＋ 実績を追加
          </Link>
        </div>

        {salesRecords.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            物販実績がまだ登録されていません。
            <br />
            <Link
              href={`/events/${id}/sales/new`}
              className="mt-2 inline-block text-green-600 hover:underline"
            >
              ＋ 物販実績を入力する
            </Link>
          </div>
        ) : (
          <>
            {/* 物販サマリー */}
            <div className="mb-4 grid grid-cols-3 gap-3 rounded border border-gray-100 bg-gray-50 p-3">
              <div>
                <p className="text-xs text-gray-500">物販売上合計</p>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(merchandiseRevenue)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">粗利合計</p>
                <p className={`text-sm font-bold ${totalGrossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {formatCurrency(totalGrossProfit)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">販売個数</p>
                <p className="text-sm font-bold text-gray-900">{totalQuantity.toLocaleString()}個</p>
              </div>
            </div>

            {/* 実績テーブル */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500">
                    <th className="pb-2 pr-3 text-left font-medium">商品</th>
                    <th className="pb-2 pr-3 text-left font-medium">バリエーション</th>
                    <th className="pb-2 pr-3 text-right font-medium">数量</th>
                    <th className="pb-2 pr-3 text-right font-medium">単価</th>
                    <th className="pb-2 pr-3 text-right font-medium">売上</th>
                    <th className="pb-2 pr-3 text-right font-medium">粗利</th>
                    <th className="pb-2 text-left font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {salesRecords.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-3 text-gray-800">{r.goodsName}</td>
                      <td className="py-2 pr-3 text-gray-500">{r.variantLabel ?? "—"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-gray-700">{r.quantity}個</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-gray-700">{formatCurrency(r.sellingPrice)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums font-medium text-gray-800">{formatCurrency(r.revenue)}</td>
                      <td className={`py-2 pr-3 text-right tabular-nums font-medium ${r.grossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {formatCurrency(r.grossProfit)}
                      </td>
                      <td className="whitespace-nowrap py-2">
                        <div className="flex gap-3">
                          <Link
                            href={`/sales/${r.id}/edit?from=/events/${id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            編集
                          </Link>
                          <Link
                            href={`/sales/${r.id}/delete?from=/events/${id}`}
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
                  <tr className="border-t text-xs font-semibold text-gray-700">
                    <td className="pt-2 pr-3" colSpan={2}>合計</td>
                    <td className="pt-2 pr-3 text-right tabular-nums">{totalQuantity}個</td>
                    <td className="pt-2 pr-3"></td>
                    <td className="pt-2 pr-3 text-right tabular-nums">{formatCurrency(merchandiseRevenue)}</td>
                    <td className={`pt-2 pr-3 text-right tabular-nums ${totalGrossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {formatCurrency(totalGrossProfit)}
                    </td>
                    <td className="pt-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
