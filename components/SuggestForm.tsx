"use client";

import { useState, useTransition } from "react";
import { generateSuggestions, saveHistoryAction } from "@/app/goods/suggest/actions";
import { scoreSuggestion } from "@/lib/scoreSuggestion";
import SuggestionCard from "@/components/SuggestionCard";
import Link from "next/link";
import type { GoodsSuggestion, SuggestionConditions, SuggestionMode } from "@/types/suggestion";
import type { GoodsCategory, GoodsCalculated } from "@/types/goods";

const ALL_CATEGORIES: GoodsCategory[] = [
  "Tシャツ", "パーカー・スウェット", "タオル", "アクスタ", "キーホルダー",
  "キャップ・バッグ", "ステッカー・クリアファイル", "応援グッズ",
  "書籍・カレンダー", "ポートレート・写真", "ガチャガチャ", "FC特典", "その他",
];

const MODES: { value: SuggestionMode; label: string; description: string }[] = [
  {
    value: "data",
    label: "データ分析",
    description: "過去の販売実績・HIT/NG傾向をもとに提案",
  },
  {
    value: "free",
    label: "自由発想",
    description: "トレンド・市場・ファン文化など広い視点で提案",
  },
];

const DEFAULT_CONDITIONS: SuggestionConditions = {
  mode: "data",
  count: 3,
  categories: [],
  target: "",
  channel: "",
  priceRange: "",
  freeComment: "",
};

interface Props {
  allGoods: GoodsCalculated[];
}

export default function SuggestForm({ allGoods }: Props) {
  const [conditions, setConditions] = useState<SuggestionConditions>(DEFAULT_CONDITIONS);
  const [suggestions, setSuggestions] = useState<GoodsSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [savedHistoryId, setSavedHistoryId] = useState<string | null>(null);
  const [isSavingHistory, startSaveHistory] = useTransition();

  function toggleCategory(cat: GoodsCategory) {
    setConditions((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedHistoryId(null);
    startTransition(async () => {
      const result = await generateSuggestions(conditions);
      if (result.error) {
        setError(result.error);
      } else {
        setSuggestions(result.suggestions);
      }
    });
  }

  function handleSaveHistory() {
    startSaveHistory(async () => {
      const result = await saveHistoryAction(conditions, suggestions);
      setSavedHistoryId(result.historyId);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* 条件入力 */}
        <aside>
          <form onSubmit={handleSubmit} className="rounded border border-gray-200 bg-white p-5 space-y-5">
            <h2 className="text-sm font-semibold text-gray-700">提案条件</h2>

            {/* モード切替 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">提案モード</label>
              <div className="grid grid-cols-2 gap-2">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setConditions((p) => ({ ...p, mode: m.value }))}
                    className={`rounded border p-2.5 text-left transition-colors ${
                      conditions.mode === m.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className={`text-xs font-semibold ${conditions.mode === m.value ? "text-blue-700" : "text-gray-700"}`}>
                      {m.label}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400 leading-tight">{m.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 提案件数 */}
            <div>
              <label className="block text-xs font-medium text-gray-600">提案件数</label>
              <select
                value={conditions.count}
                onChange={(e) => setConditions((p) => ({ ...p, count: Number(e.target.value) }))}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}件</option>
                ))}
              </select>
            </div>

            {/* カテゴリ */}
            <div>
              <label className="block text-xs font-medium text-gray-600">
                カテゴリ <span className="text-gray-400">（指定なし = 全カテゴリ）</span>
              </label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ALL_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`rounded px-2 py-1 text-xs transition-colors ${
                      conditions.categories.includes(cat)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* ターゲット */}
            <div>
              <label className="block text-xs font-medium text-gray-600">ターゲット</label>
              <select
                value={conditions.target}
                onChange={(e) => setConditions((p) => ({ ...p, target: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">指定なし</option>
                <option value="コアファン向け">コアファン向け</option>
                <option value="一般向け">一般向け</option>
                <option value="家族向け">家族向け</option>
                <option value="新規ファン向け">新規ファン向け</option>
              </select>
            </div>

            {/* チャネル */}
            <div>
              <label className="block text-xs font-medium text-gray-600">販売チャネル</label>
              <select
                value={conditions.channel}
                onChange={(e) => setConditions((p) => ({ ...p, channel: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">指定なし</option>
                <option value="会場">会場</option>
                <option value="EC">EC</option>
                <option value="FC限定">FC限定</option>
                <option value="会場+EC">会場+EC</option>
              </select>
            </div>

            {/* 価格帯 */}
            <div>
              <label className="block text-xs font-medium text-gray-600">想定価格帯</label>
              <select
                value={conditions.priceRange}
                onChange={(e) => setConditions((p) => ({ ...p, priceRange: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">指定なし</option>
                <option value="低（〜¥2,000）">低（〜¥2,000）</option>
                <option value="中（〜¥5,000）">中（〜¥5,000）</option>
                <option value="高（¥5,000〜）">高（¥5,000〜）</option>
              </select>
            </div>

            {/* 自由コメント */}
            <div>
              <label className="block text-xs font-medium text-gray-600">
                備考・テーマ <span className="text-gray-400">（任意）</span>
              </label>
              <textarea
                value={conditions.freeComment}
                onChange={(e) => setConditions((p) => ({ ...p, freeComment: e.target.value }))}
                rows={3}
                placeholder="例：夏の大会向け、選手コラボ想定..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "AIが提案を生成中..." : "提案を生成する"}
            </button>
          </form>
        </aside>

        {/* 提案結果 */}
        <div>
          {isPending && (
            <div className="flex items-center justify-center py-20 text-sm text-gray-500">
              <span className="animate-pulse">AIが過去データを分析して提案を生成しています...</span>
            </div>
          )}

          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!isPending && suggestions.length > 0 && (
            <div className="space-y-4">
              {/* 件数バー + 保存ボタン */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-500">
                  {suggestions.length}件の提案が生成されました。
                  <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-medium ${
                    conditions.mode === "free"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {conditions.mode === "free" ? "自由発想モード" : "データ分析モード"}
                  </span>
                </p>

                {savedHistoryId ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                      ✓ 保存済み
                    </span>
                    <Link
                      href={`/goods/suggest/history/${savedHistoryId}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      履歴を見る →
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={handleSaveHistory}
                    disabled={isSavingHistory}
                    className="shrink-0 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isSavingHistory ? "保存中..." : "この提案を保存"}
                  </button>
                )}
              </div>

              {suggestions.map((s, i) => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  index={i}
                  historyId={savedHistoryId ?? undefined}
                  score={scoreSuggestion(s, allGoods)}
                />
              ))}
            </div>
          )}

          {!isPending && suggestions.length === 0 && !error && (
            <div className="flex items-center justify-center rounded border border-dashed border-gray-300 py-20 text-sm text-gray-400">
              条件を入力して「提案を生成する」を押してください。
            </div>
          )}
        </div>
    </div>
  );
}
