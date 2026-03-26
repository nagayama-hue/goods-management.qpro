import Link from "next/link";
import { getAllSuppliers } from "@/lib/supplierStore";
import {
  SUPPLIER_GENRES,
  PRICE_SENSE_STYLE,
  DELIVERY_SPEED_STYLE,
  QUALITY_STYLE,
  type SupplierGenre,
} from "@/types/supplier";

interface Props {
  searchParams: Promise<{ genre?: string; sort?: string }>;
}

/** 評価を ★ 文字列に変換 */
function stars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export default async function SuppliersPage({ searchParams }: Props) {
  const { genre: genreFilter, sort } = await searchParams;

  const all = getAllSuppliers();

  const filtered = genreFilter
    ? all.filter((s) => s.genres.includes(genreFilter as SupplierGenre))
    : all;

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    // デフォルト: 評価降順 → 名前昇順
    return b.rating - a.rating || a.name.localeCompare(b.name);
  });

  const GENRE_TABS: { label: string; value: string | undefined }[] = [
    { label: "全て", value: undefined },
    ...SUPPLIER_GENRES.map((g) => ({ label: g, value: g })),
  ];

  function genreHref(value: string | undefined) {
    if (!value) return sort ? `/suppliers?sort=${sort}` : "/suppliers";
    return sort
      ? `/suppliers?genre=${encodeURIComponent(value)}&sort=${sort}`
      : `/suppliers?genre=${encodeURIComponent(value)}`;
  }

  function sortHref(s: string) {
    return genreFilter
      ? `/suppliers?genre=${encodeURIComponent(genreFilter)}&sort=${s}`
      : `/suppliers?sort=${s}`;
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">取引先管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            グッズ発注先の一覧です。ジャンルで絞り込んで比較できます。
          </p>
        </div>
        <Link
          href="/suppliers/new"
          className="shrink-0 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          ＋ 新規登録
        </Link>
      </div>

      {/* ジャンルフィルター */}
      <div className="flex flex-wrap gap-2">
        {GENRE_TABS.map(({ label, value }) => {
          const active = (!genreFilter && !value) || genreFilter === value;
          return (
            <Link
              key={label}
              href={genreHref(value)}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                active
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* 並び替え */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>並び替え：</span>
        <Link
          href={sortHref("rating")}
          className={`rounded px-2.5 py-1 ${
            !sort || sort === "rating"
              ? "bg-gray-200 font-medium text-gray-800"
              : "hover:text-gray-700"
          }`}
        >
          評価順
        </Link>
        <Link
          href={sortHref("name")}
          className={`rounded px-2.5 py-1 ${
            sort === "name"
              ? "bg-gray-200 font-medium text-gray-800"
              : "hover:text-gray-700"
          }`}
        >
          名前順
        </Link>
      </div>

      {/* 一覧 */}
      {sorted.length === 0 ? (
        <div className="rounded border border-dashed border-gray-300 py-16 text-center text-sm text-gray-400">
          取引先が登録されていません。「＋ 新規登録」から追加してください。
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs">
                <th className="px-4 py-2.5 font-medium text-gray-500">取引先名</th>
                <th className="px-4 py-2.5 font-medium text-gray-500">対応ジャンル</th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-500">価格感</th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-500">納期</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-500">最低ロット</th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-500">品質</th>
                <th className="px-4 py-2.5 font-medium text-gray-500">評価</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/suppliers/${s.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {s.name}
                    </Link>
                    {s.contactName && (
                      <p className="mt-0.5 text-xs text-gray-400">{s.contactName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.genres.map((g) => (
                        <span
                          key={g}
                          className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${PRICE_SENSE_STYLE[s.priceSense]}`}
                    >
                      {s.priceSense}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${DELIVERY_SPEED_STYLE[s.deliverySpeed]}`}
                    >
                      {s.deliverySpeed}
                    </span>
                    {s.deliveryDays !== undefined && (
                      <p className="mt-0.5 text-xs text-gray-400">{s.deliveryDays}日</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                    {s.minLot !== undefined ? `${s.minLot.toLocaleString()}個〜` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${QUALITY_STYLE[s.quality]}`}
                    >
                      {s.quality}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-yellow-500 tabular-nums text-xs tracking-tight">
                    {stars(s.rating)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/suppliers/${s.id}/edit`}
                      className="text-xs text-gray-400 hover:text-blue-600 hover:underline"
                    >
                      編集
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
