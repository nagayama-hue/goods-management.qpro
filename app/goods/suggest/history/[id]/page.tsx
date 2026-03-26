import { notFound } from "next/navigation";
import Link from "next/link";
import { getHistoryById } from "@/lib/historyStore";
import { getGoodsById } from "@/lib/store";

interface Props {
  params: Promise<{ id: string }>;
}

const MODE_LABELS: Record<string, string> = {
  data:       "データ分析",
  free:       "自由発想",
  monthly:    "月次提案",
  derivative: "派生提案",
};

function yen(v: number): string {
  return `¥${v.toLocaleString()}`;
}

export default async function SuggestionHistoryDetailPage({ params }: Props) {
  const { id } = await params;
  const history = getHistoryById(id);
  if (!history) notFound();

  const date = new Date(history.createdAt).toLocaleString("ja-JP", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const c = history.conditions;
  const registeredCount = history.suggestions.filter((s) => s.registeredGoodsId).length;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/goods/suggest/history" className="text-sm text-gray-400 hover:text-gray-600">
              ← 履歴一覧
            </Link>
          </div>
          <h1 className="mt-2 text-xl font-semibold text-gray-900">提案履歴の詳細</h1>
          <p className="mt-0.5 text-sm text-gray-500">{date}</p>
        </div>
        <span className="shrink-0 rounded bg-blue-100 px-2.5 py-1 text-sm font-medium text-blue-700">
          {MODE_LABELS[history.mode] ?? history.mode}
        </span>
      </div>

      {/* 入力条件 */}
      {c && (
        <section className="rounded border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">入力条件</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-gray-500">提案件数</dt>
              <dd className="mt-0.5 text-gray-800">{c.count}件</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">カテゴリ</dt>
              <dd className="mt-0.5 text-gray-800">
                {c.categories.length > 0 ? c.categories.join("・") : "指定なし"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">ターゲット</dt>
              <dd className="mt-0.5 text-gray-800">{c.target || "指定なし"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">販売チャネル</dt>
              <dd className="mt-0.5 text-gray-800">{c.channel || "指定なし"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">価格帯</dt>
              <dd className="mt-0.5 text-gray-800">{c.priceRange || "指定なし"}</dd>
            </div>
            {c.freeComment && (
              <div className="col-span-2">
                <dt className="text-xs text-gray-500">備考</dt>
                <dd className="mt-0.5 text-gray-800">{c.freeComment}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* 提案一覧 */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700">
            提案された案（{history.suggestions.length}件）
          </h2>
          {registeredCount > 0 && (
            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              {registeredCount}件登録済み
            </span>
          )}
        </div>

        <div className="space-y-3">
          {history.suggestions.map((s, i) => {
            const registeredGoods = s.registeredGoodsId
              ? getGoodsById(s.registeredGoodsId)
              : null;

            return (
              <div
                key={s.id}
                className={`rounded border bg-white p-4 ${
                  s.registeredGoodsId ? "border-green-200 bg-green-50" : "border-gray-200"
                }`}
              >
                {/* タイトル行 */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">#{i + 1}</span>
                      <span className="text-sm font-semibold text-gray-900">{s.name}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                        {s.category}
                      </span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                        {s.salesChannel}
                      </span>
                    </div>
                  </div>

                  {/* 登録状態 */}
                  {s.registeredGoodsId ? (
                    <div className="shrink-0 text-right">
                      <span className="block rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        ✓ 登録済み
                      </span>
                      {registeredGoods && (
                        <Link
                          href={`/goods/${s.registeredGoodsId}`}
                          className="mt-1 block text-xs text-blue-600 hover:underline"
                        >
                          商品を見る →
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="shrink-0 text-right space-y-1">
                      {(s.priority === "今すぐ作る" || s.priority === "次月候補") && (
                        <span className="block rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                          機会損失候補
                        </span>
                      )}
                      <Link
                        href={`/goods/suggest`}
                        className="block rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        未登録
                      </Link>
                    </div>
                  )}
                </div>

                {/* 数値 */}
                <div className="mt-3 grid grid-cols-3 gap-2 rounded bg-gray-50 p-2 text-xs">
                  <div>
                    <div className="text-gray-400">想定価格</div>
                    <div className="font-medium text-gray-800">{yen(s.estimatedPrice)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">想定原価</div>
                    <div className="font-medium text-gray-800">{yen(s.estimatedCost)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">想定粗利</div>
                    <div className={`font-medium ${s.estimatedProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {yen(s.estimatedProfit)}
                    </div>
                  </div>
                </div>

                {/* 企画理由・リスク */}
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  <p><span className="font-medium text-gray-700">理由: </span>{s.reason}</p>
                  <p><span className="font-medium text-yellow-700">リスク: </span>{s.risk}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
