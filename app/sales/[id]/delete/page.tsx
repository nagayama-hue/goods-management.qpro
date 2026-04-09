import { notFound } from "next/navigation";
import Link from "next/link";
import { getSalesRecordById } from "@/lib/salesRecordStore";
import { formatCurrency } from "@/lib/format";
import { deleteSaleAction } from "./actions";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function DeleteSalePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { from } = await searchParams;
  const returnTo = from ?? "/sales";

  const record = getSalesRecordById(id);
  if (!record) notFound();

  const boundDelete = deleteSaleAction.bind(null, id, returnTo);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">売上実績を削除</h1>

      {/* 削除対象の確認 */}
      <section className="rounded border border-red-200 bg-red-50 p-5">
        <p className="mb-4 text-sm font-semibold text-red-700">
          以下の売上実績を削除します。この操作は取り消せません。
        </p>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-gray-500">販売日</dt>
            <dd className="font-medium text-gray-800">{record.saleDate}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">大会・販売場所</dt>
            <dd className="font-medium text-gray-800">{record.eventName ?? record.location}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">商品</dt>
            <dd className="font-medium text-gray-800">{record.goodsName}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">バリエーション</dt>
            <dd className="font-medium text-gray-800">{record.variantLabel ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">数量</dt>
            <dd className="font-medium text-gray-800">{record.quantity}個</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">売上</dt>
            <dd className="font-medium text-gray-800">{formatCurrency(record.revenue)}</dd>
          </div>
        </dl>
      </section>

      {/* 削除後の影響説明 */}
      <section className="rounded border border-gray-200 bg-white p-4">
        <p className="text-xs font-medium text-gray-600 mb-2">削除すると以下が自動で戻ります</p>
        <ul className="space-y-1 text-xs text-gray-500">
          <li>• {record.variantLabel ?? "商品"} の在庫数: +{record.quantity}個</li>
          <li>• {record.variantLabel ?? "商品"} の販売数: -{record.quantity}個</li>
          <li>• 売上実績一覧・商品詳細・大会詳細の集計値が更新されます</li>
        </ul>
      </section>

      <div className="flex items-center justify-between">
        <Link href={returnTo} className="text-sm text-gray-500 hover:text-gray-700">
          ← キャンセル
        </Link>
        <form action={boundDelete}>
          <button
            type="submit"
            className="rounded bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            削除する
          </button>
        </form>
      </div>
    </div>
  );
}
