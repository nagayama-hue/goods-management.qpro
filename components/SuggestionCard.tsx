"use client";

import { useState, useTransition } from "react";
import { saveSuggestion, saveSuggestionAndEdit } from "@/app/goods/suggest/actions";
import ScoreBadge from "@/components/ScoreBadge";
import type { GoodsSuggestion } from "@/types/suggestion";
import type { GoodsScore } from "@/types/score";
import { PRIORITY_STYLES } from "@/lib/constants";

function yen(v: number): string {
  return `¥${v.toLocaleString()}`;
}

interface Props {
  suggestion: GoodsSuggestion;
  index:      number;
  historyId?: string;     // 履歴セッションのID（保存済みの場合）
  score?:     GoodsScore; // 売れる確率スコア（省略時は非表示）
}

export default function SuggestionCard({ suggestion: s, index, historyId, score }: Props) {
  const [isSaving, startSave] = useTransition();
  const [isEditing, startEdit] = useTransition();
  const [registered, setRegistered] = useState(false);
  const isPending = isSaving || isEditing;

  return (
    <div className={`rounded border bg-white p-5 space-y-4 ${registered ? "border-green-300 bg-green-50" : "border-gray-200"}`}>
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">#{index + 1}</span>
            <h3 className="text-base font-semibold text-gray-900">{s.name}</h3>
            {registered && (
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                登録済み
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              {s.category}
            </span>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {s.salesChannel}
            </span>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[s.priority]}`}>
              優先度: {s.priority}
            </span>
            {score && (
              <ScoreBadge score={score.score} level={score.level} size="sm" />
            )}
          </div>
        </div>

        {/* 登録ボタン */}
        {registered ? (
          <span className="shrink-0 rounded border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700">
            ✓ 登録済み
          </span>
        ) : (
          <div className="flex shrink-0 flex-col gap-1.5">
            <button
              onClick={() => {
                setRegistered(true);
                startSave(() => saveSuggestion(s, historyId));
              }}
              disabled={isPending}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "登録中..." : "この案を登録する"}
            </button>
            <button
              onClick={() => {
                setRegistered(true);
                startEdit(() => saveSuggestionAndEdit(s, historyId));
              }}
              disabled={isPending}
              className="rounded border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              {isEditing ? "移動中..." : "編集して登録"}
            </button>
          </div>
        )}
      </div>

      {/* 数値 */}
      <div className="grid grid-cols-3 gap-3 rounded bg-gray-50 p-3 text-sm">
        <div>
          <div className="text-xs text-gray-500">想定販売価格</div>
          <div className="mt-0.5 font-semibold text-gray-900">{yen(s.estimatedPrice)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">想定原価</div>
          <div className="mt-0.5 font-semibold text-gray-900">{yen(s.estimatedCost)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">想定粗利</div>
          <div className={`mt-0.5 font-semibold ${s.estimatedProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
            {yen(s.estimatedProfit)}
          </div>
        </div>
      </div>

      {/* 詳細 */}
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-xs font-medium text-gray-500">ターゲット</dt>
          <dd className="mt-0.5 text-gray-800">{s.target}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">コンセプト</dt>
          <dd className="mt-0.5 text-gray-800">{s.concept}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">企画理由</dt>
          <dd className="mt-0.5 text-gray-800">{s.reason}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">過去データとの関連</dt>
          <dd className="mt-0.5 text-gray-700">{s.dataInsight}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">リスク</dt>
          <dd className="mt-0.5 text-yellow-700">{s.risk}</dd>
        </div>
      </dl>

      {/* スコア理由 */}
      {score && (score.plusReasons.length > 0 || score.minusReasons.length > 0) && (
        <div className="rounded bg-gray-50 p-3 text-xs space-y-2">
          <p className="font-medium text-gray-600">スコア根拠</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {score.plusReasons.map((r) => (
              <span key={r} className="flex items-center gap-1 text-green-700">
                <span>＋</span>{r}
              </span>
            ))}
            {score.minusReasons.map((r) => (
              <span key={r} className="flex items-center gap-1 text-red-600">
                <span>－</span>{r}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
