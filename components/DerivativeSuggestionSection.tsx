"use client";

import { useState, useTransition } from "react";
import {
  generateDerivativeSuggestions,
  saveDerivativeAsGoods,
} from "@/app/goods/[id]/actions";
import type { GoodsCalculated } from "@/types/goods";
import type { DerivativeSuggestion } from "@/types/suggestion";

function yen(v: number): string {
  return `¥${v.toLocaleString()}`;
}

interface Props {
  goods: GoodsCalculated;
}

export default function DerivativeSuggestionSection({ goods }: Props) {
  const [suggestions, setSuggestions] = useState<DerivativeSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerate] = useTransition();
  const [isSaving, startSave] = useTransition();

  async function handleGenerate() {
    setError(null);
    startGenerate(async () => {
      const result = await generateDerivativeSuggestions(goods);
      if (result.error) {
        setError(result.error);
      } else {
        setSuggestions(result.suggestions);
      }
    });
  }

  return (
    <section className="rounded border border-green-200 bg-green-50 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-green-900">HIT派生案</h2>
          <p className="mt-0.5 text-xs text-green-700">
            この商品をベースに、売れる可能性の高い派生案を提案します
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="shrink-0 rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isGenerating ? "生成中..." : suggestions.length > 0 ? "再生成する" : "派生案を生成する"}
        </button>
      </div>

      {isGenerating && (
        <div className="mt-4 rounded bg-white px-4 py-6 text-center text-sm text-gray-400 animate-pulse">
          AIが派生案を生成しています...
        </div>
      )}

      {error && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isGenerating && suggestions.length === 0 && !error && (
        <div className="mt-4 rounded border border-dashed border-green-200 bg-white py-6 text-center text-sm text-gray-400">
          「派生案を生成する」を押してください。
        </div>
      )}

      {!isGenerating && suggestions.length > 0 && (
        <div className="mt-4 space-y-3">
          {suggestions.map((s, i) => (
            <div key={s.id} className="rounded border border-gray-200 bg-white p-4 space-y-3">
              {/* タイトル・登録ボタン */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">#{i + 1}</span>
                    <span className="text-sm font-semibold text-gray-900">{s.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-blue-700 bg-blue-50 rounded px-2 py-0.5 inline-block">
                    変更点: {s.changePoint}
                  </p>
                </div>
                <button
                  onClick={() => startSave(() => saveDerivativeAsGoods(goods, s))}
                  disabled={isSaving}
                  className="shrink-0 rounded border border-green-300 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                >
                  {isSaving ? "登録中..." : "商品登録"}
                </button>
              </div>

              {/* 数値 */}
              <div className="grid grid-cols-3 gap-2 rounded bg-gray-50 p-2 text-xs">
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

              {/* 理由・リスク */}
              <p className="text-xs text-gray-700 leading-relaxed">{s.reason}</p>
              <p className="text-xs text-yellow-700">⚠ {s.risk}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
