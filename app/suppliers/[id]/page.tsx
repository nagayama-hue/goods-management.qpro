import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupplierById } from "@/lib/supplierStore";
import { getLinksForSupplier } from "@/lib/goodsSupplierStore";
import { getGoodsById } from "@/lib/store";
import { calcGoods } from "@/lib/calculations";
import {
  PRICE_SENSE_STYLE,
  DELIVERY_SPEED_STYLE,
  QUALITY_STYLE,
} from "@/types/supplier";
import { PRIORITY_LABEL_STYLE } from "@/types/goodsSupplier";
import StatusBadge from "@/components/StatusBadge";

interface Props {
  params: Promise<{ id: string }>;
}

function stars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export default async function SupplierDetailPage({ params }: Props) {
  const { id } = await params;
  const s = getSupplierById(id);
  if (!s) notFound();

  const createdAt = new Date(s.createdAt).toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric",
  });

  // 紐付き商品データ
  const links = getLinksForSupplier(id);
  const linkedGoods = links
    .map((link) => {
      const g = getGoodsById(link.goodsId);
      if (!g) return null;
      const calc = calcGoods(g);
      return { link, goods: calc };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    // 推奨を上に、候補は優先区分順
    .sort((a, b) => {
      if (a.link.relationType === "recommended") return -1;
      if (b.link.relationType === "recommended") return 1;
      const order: Record<string, number> = { 第一候補: 0, 第二候補: 1, 比較用: 2 };
      return (order[a.link.priorityLabel ?? "比較用"] ?? 2) - (order[b.link.priorityLabel ?? "比較用"] ?? 2);
    });

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/suppliers" className="text-sm text-gray-400 hover:text-gray-600">
            ← 取引先一覧
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-gray-900">{s.name}</h1>
          <p className="mt-0.5 text-sm text-yellow-500 tracking-tight">{stars(s.rating)}</p>
        </div>
        <Link
          href={`/suppliers/${s.id}/edit`}
          className="shrink-0 rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-800"
        >
          編集
        </Link>
      </div>

      {/* 基本情報 */}
      <section className="rounded border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">基本情報</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          {s.contactName && (
            <div>
              <dt className="text-xs text-gray-400">担当者</dt>
              <dd className="mt-0.5 text-gray-800">{s.contactName}</dd>
            </div>
          )}
          {s.phone && (
            <div>
              <dt className="text-xs text-gray-400">電話番号</dt>
              <dd className="mt-0.5 text-gray-800">
                <a href={`tel:${s.phone}`} className="text-blue-600 hover:underline">
                  {s.phone}
                </a>
              </dd>
            </div>
          )}
          {s.email && (
            <div>
              <dt className="text-xs text-gray-400">メール</dt>
              <dd className="mt-0.5 text-gray-800">
                <a href={`mailto:${s.email}`} className="text-blue-600 hover:underline">
                  {s.email}
                </a>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-gray-400">登録日</dt>
            <dd className="mt-0.5 text-gray-800">{createdAt}</dd>
          </div>
        </dl>
      </section>

      {/* 実務情報 */}
      <section className="rounded border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">実務情報</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-3">
          {/* 対応ジャンル */}
          <div className="col-span-2 sm:col-span-3">
            <dt className="mb-1.5 text-xs text-gray-400">対応ジャンル</dt>
            <dd className="flex flex-wrap gap-1.5">
              {s.genres.length > 0
                ? s.genres.map((g) => (
                    <span
                      key={g}
                      className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                    >
                      {g}
                    </span>
                  ))
                : <span className="text-gray-400 text-xs">未設定</span>}
            </dd>
          </div>

          {/* 価格感 */}
          <div>
            <dt className="text-xs text-gray-400">価格感</dt>
            <dd className="mt-1">
              <span
                className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${PRICE_SENSE_STYLE[s.priceSense]}`}
              >
                {s.priceSense}
              </span>
            </dd>
          </div>

          {/* 納期 */}
          <div>
            <dt className="text-xs text-gray-400">納期感</dt>
            <dd className="mt-1">
              <span
                className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${DELIVERY_SPEED_STYLE[s.deliverySpeed]}`}
              >
                {s.deliverySpeed}
              </span>
              {s.deliveryDays !== undefined && (
                <span className="ml-2 text-xs text-gray-500">目安 {s.deliveryDays}日</span>
              )}
            </dd>
          </div>

          {/* 最低ロット */}
          <div>
            <dt className="text-xs text-gray-400">最低ロット</dt>
            <dd className="mt-0.5 text-gray-800">
              {s.minLot !== undefined ? `${s.minLot.toLocaleString()}個〜` : "—"}
            </dd>
          </div>

          {/* 品質 */}
          <div>
            <dt className="text-xs text-gray-400">品質</dt>
            <dd className="mt-1">
              <span
                className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${QUALITY_STYLE[s.quality]}`}
              >
                {s.quality}
              </span>
            </dd>
          </div>

          {/* 評価 */}
          <div>
            <dt className="text-xs text-gray-400">評価</dt>
            <dd className="mt-0.5 text-yellow-500 tracking-tight">{stars(s.rating)}</dd>
          </div>
        </dl>
      </section>

      {/* メモ */}
      {s.memo && (
        <section className="rounded border border-gray-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">メモ</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{s.memo}</p>
        </section>
      )}

      {/* 紐付き商品一覧 */}
      <section className="rounded border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          紐付き商品
          {linkedGoods.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">{linkedGoods.length}件</span>
          )}
        </h2>

        {linkedGoods.length === 0 ? (
          <p className="text-sm text-gray-400">
            この取引先に紐付いている商品はありません。
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs">
                  <th className="px-3 py-2 font-medium text-gray-500">商品名</th>
                  <th className="px-3 py-2 font-medium text-gray-500">カテゴリ</th>
                  <th className="px-3 py-2 font-medium text-gray-500">ステータス</th>
                  <th className="px-3 py-2 font-medium text-gray-500">区分</th>
                  <th className="px-3 py-2 font-medium text-gray-500">メモ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {linkedGoods.map(({ link, goods: g }) => (
                  <tr key={link.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/goods/${g.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {g.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{g.category}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={g.status} />
                    </td>
                    <td className="px-3 py-2.5">
                      {link.relationType === "recommended" ? (
                        <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                          推奨
                        </span>
                      ) : (
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            PRIORITY_LABEL_STYLE[link.priorityLabel ?? "比較用"]
                          }`}
                        >
                          {link.priorityLabel ?? "比較用"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 max-w-xs truncate">
                      {link.note ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
