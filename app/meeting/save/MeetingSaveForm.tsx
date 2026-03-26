"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { saveMeetingAction, generateMeetingMemo } from "./actions";
import { PRIORITY_STYLES } from "@/lib/constants";
import { MEETING_RESULT_OPTIONS } from "@/types/meeting";
import type { GoodsCalculated, GoodsEvaluation, Priority, GoodsStatus } from "@/types/goods";
import type { MeetingResult } from "@/types/meeting";

// ─── 定数 ──────────────────────────────────────────────────────────────────

const MEMO_TEMPLATE = `### 今回の結論
（この会議で決まったことを簡潔に）

### 判断理由
（なぜその判断になったか）

### 次アクション
（誰が・何を・いつまでに）

### リスク・懸念
（考えられるリスクや不安点）`;

// ─── 型 ────────────────────────────────────────────────────────────────────

interface Row {
  goods:      GoodsCalculated;
  evaluation: GoodsEvaluation;
}

interface Props {
  rows:             Row[];
  today:            string;
  backHref:         string;
  filterParamsJson: string;
}

// ─── コンポーネント ─────────────────────────────────────────────────────────

export default function MeetingSaveForm({
  rows,
  today,
  backHref,
  filterParamsJson,
}: Props) {
  // フォーム基本情報
  const [name, setName] = useState("");
  const [date, setDate] = useState(today);
  const [memo, setMemo] = useState(MEMO_TEMPLATE);

  // 商品ごとの判断（未設定 = 継続検討として扱う）
  const [results,  setResults]  = useState<Record<string, MeetingResult>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  // どの行が明示的に変更されたかを追跡
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // AI生成状態
  const [generating, startGenerating] = useTransition();
  const [genError,   setGenError]     = useState("");

  // ─── AI生成ハンドラ ─────────────────────────────────────────────────────

  function handleGenerate() {
    setGenError("");
    startGenerating(async () => {
      const items = rows.map(({ goods: g }) => ({
        goodsName: g.name,
        priority:  g.priority as Priority,
        status:    g.status   as GoodsStatus,
        result:    results[g.id] ?? "継続検討",
        comment:   comments[g.id] ?? "",
      }));

      const res = await generateMeetingMemo({ name, date, items });
      if (res.ok && res.memo) {
        setMemo(res.memo);
      } else {
        setGenError(res.error ?? "生成に失敗しました");
      }
    });
  }

  // 未入力（未タッチ）の件数
  const untouchedCount = rows.filter(({ goods: g }) => !touched.has(g.id)).length;

  return (
    <form action={saveMeetingAction} className="space-y-6">

      {/* ── hidden: スコープ・フィルター条件 ── */}
      <input type="hidden" name="scope"        value="filtered" />
      <input type="hidden" name="filterParams" value={filterParamsJson} />

      {/* ── hidden: 商品ID一覧 ── */}
      <input
        type="hidden"
        name="goodsIds"
        value={rows.map((r) => r.goods.id).join(",")}
      />

      {/* ── hidden: 各商品のスナップショット＋判断結果 ── */}
      {rows.map(({ goods: g }) => (
        <span key={g.id}>
          <input type="hidden" name={`goodsName_${g.id}`} value={g.name} />
          <input type="hidden" name={`priority_${g.id}`}  value={g.priority} />
          <input type="hidden" name={`status_${g.id}`}    value={g.status} />
          <input type="hidden" name={`result_${g.id}`}    value={results[g.id]  ?? "継続検討"} />
          <input type="hidden" name={`comment_${g.id}`}   value={comments[g.id] ?? ""} />
        </span>
      ))}

      {/* ── 会議情報 ── */}
      <div className="rounded border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">会議情報</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              会議名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：3月定例会議"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              実施日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* ── 商品ごとの判断 ── */}
      <div className="rounded border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">
            対象商品
            <span className="ml-1.5 font-normal text-gray-400">{rows.length} 件</span>
          </h2>
          {/* 未入力の件数をさりげなく表示 */}
          {untouchedCount > 0 && (
            <p className="text-xs text-gray-400">
              未入力 {untouchedCount} 件 → 生成時に「継続検討」として扱われます
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-2 font-medium text-gray-500">商品名</th>
                <th className="px-4 py-2 font-medium text-gray-500">優先度</th>
                <th className="px-4 py-2 font-medium text-gray-500">ステータス</th>
                <th className="px-4 py-2 font-medium text-gray-500">
                  会議結果 <span className="text-red-400">*</span>
                </th>
                <th className="px-4 py-2 font-medium text-gray-500">コメント（任意）</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(({ goods: g }) => {
                const isTouched     = touched.has(g.id);
                const currentResult = results[g.id] ?? "継続検討";

                return (
                  <tr
                    key={g.id}
                    className={`bg-white hover:bg-gray-50 ${!isTouched ? "opacity-70" : ""}`}
                  >
                    {/* 商品名 */}
                    <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">
                      {g.name}
                      {!isTouched && (
                        <span className="ml-1.5 text-gray-300 font-normal">未入力</span>
                      )}
                    </td>

                    {/* 優先度 */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[g.priority]}`}
                      >
                        {g.priority}
                      </span>
                    </td>

                    {/* ステータス */}
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                      {g.status}
                    </td>

                    {/* 会議結果セレクト（name なし → hidden input で送信） */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <select
                        value={currentResult}
                        onChange={(e) => {
                          const val = e.target.value as MeetingResult;
                          setResults((prev) => ({ ...prev, [g.id]: val }));
                          setTouched((prev) => new Set(prev).add(g.id));
                        }}
                        className={`rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isTouched
                            ? "border-gray-300 text-gray-800"
                            : "border-gray-200 text-gray-400"
                        }`}
                      >
                        {MEETING_RESULT_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>

                    {/* コメント（name なし → hidden input で送信） */}
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={comments[g.id] ?? ""}
                        onChange={(e) => {
                          setComments((prev) => ({ ...prev, [g.id]: e.target.value }));
                          setTouched((prev) => new Set(prev).add(g.id));
                        }}
                        placeholder="コメントを入力"
                        className="w-full min-w-[160px] rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 会議メモ ── */}
      <div className="rounded border border-gray-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-gray-700">
            会議メモ（任意）
          </label>
          <div className="flex items-center gap-2">
            {genError && (
              <span className="text-xs text-red-500">{genError}</span>
            )}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 rounded border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                  生成中...
                </>
              ) : (
                <>✦ メモを自動生成</>
              )}
            </button>
          </div>
        </div>

        {/* 未入力件数の補足（生成前の確認用） */}
        {untouchedCount > 0 && (
          <p className="text-xs text-gray-400">
            ※ 会議結果が未入力の {untouchedCount} 件は「継続検討」として生成されます
          </p>
        )}

        <textarea
          name="memo"
          rows={14}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>

      {/* ── 送信 ── */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="rounded bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          保存する
        </button>
        <Link href={backHref} className="text-sm text-gray-500 hover:text-gray-700">
          キャンセル
        </Link>
      </div>
    </form>
  );
}
