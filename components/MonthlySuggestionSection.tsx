"use client";

import { useTransition } from "react";
import { generateMonthlySuggestion, saveMonthlyGoodsItem } from "@/app/dashboard/actions";
import type { MonthlySuggestionData } from "@/lib/monthlyStore";

import { PRIORITY_STYLES } from "@/lib/constants";

function yen(v: number): string {
  return `¥${v.toLocaleString()}`;
}

interface Props {
  data: MonthlySuggestionData | null;
}

export default function MonthlySuggestionSection({ data }: Props) {
  const [isGenerating, startGenerate] = useTransition();
  const [isSaving, startSave] = useTransition();

  async function handleGenerate() {
    startGenerate(async () => {
      const result = await generateMonthlySuggestion();
      if (result.error) alert(result.error);
    });
  }

  return (
    <section className="rounded border border-blue-200 bg-blue-50 p-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-blue-900">今月のおすすめ</h2>
          {data ? (
            <p className="mt-0.5 text-xs text-blue-600">
              {data.targetMonth} の提案 ·{" "}
              {new Date(data.generatedAt).toLocaleDateString("ja-JP", {
                month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
              })} 生成
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-blue-600">
              直近3ヶ月のデータをもとにAIが今月の優先商品を提案します
            </p>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="shrink-0 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isGenerating ? "生成中..." : data ? "再生成する" : "今月の提案を生成する"}
        </button>
      </div>

      {/* 生成中 */}
      {isGenerating && (
        <div className="mt-4 rounded bg-white px-4 py-8 text-center text-sm text-gray-400 animate-pulse">
          AIが直近データを分析して提案を生成しています...
        </div>
      )}

      {/* 提案なし */}
      {!isGenerating && !data && (
        <div className="mt-4 rounded border border-dashed border-blue-200 bg-white py-8 text-center text-sm text-gray-400">
          まだ提案がありません。「今月の提案を生成する」を押してください。
        </div>
      )}

      {/* 提案一覧 */}
      {!isGenerating && data && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.suggestions.map((s, i) => (
            <div key={s.id} className="rounded border border-gray-200 bg-white p-4 space-y-3">
              {/* タイトル */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">#{i + 1}</span>
                    <span className="text-sm font-semibold text-gray-900">{s.name}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">{s.category}</span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{s.salesChannel}</span>
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[s.priority]}`}>
                      {s.priority}
                    </span>
                  </div>
                </div>
              </div>

              {/* 数値 */}
              <div className="grid grid-cols-3 gap-1 rounded bg-gray-50 px-2 py-2 text-xs">
                <div>
                  <div className="text-gray-400">価格</div>
                  <div className="font-medium text-gray-800">{yen(s.estimatedPrice)}</div>
                </div>
                <div>
                  <div className="text-gray-400">原価</div>
                  <div className="font-medium text-gray-800">{yen(s.estimatedCost)}</div>
                </div>
                <div>
                  <div className="text-gray-400">粗利</div>
                  <div className={`font-medium ${s.estimatedProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {yen(s.estimatedProfit)}
                  </div>
                </div>
              </div>

              {/* 理由 */}
              <p className="text-xs text-gray-600 leading-relaxed">{s.reason}</p>

              {/* リスク */}
              <p className="text-xs text-yellow-700">⚠ {s.risk}</p>

              {/* 登録ボタン */}
              <button
                onClick={() => startSave(() => saveMonthlyGoodsItem(s))}
                disabled={isSaving}
                className="w-full rounded border border-blue-200 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                {isSaving ? "登録中..." : "この案を商品登録する"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
