import Link from "next/link";
import { getAllGoods } from "@/lib/store";
import { calcGoods } from "@/lib/calculations";
import { evaluateGoods } from "@/lib/evaluation";
import { scoreGoods } from "@/lib/scoring";
import { isAiSuggested } from "@/lib/parseAiMemo";
import { PRIORITY_OPTIONS } from "@/lib/constants";
import MeetingTable from "@/components/MeetingTable";
import type { Priority, GoodsStatus, GoodsCalculated } from "@/types/goods";
import type { EvaluationLevel } from "@/types/goods";
import type { GoodsScore } from "@/types/score";

const STATUS_OPTIONS: GoodsStatus[] = [
  "案出し中", "検討中", "採用", "制作中", "発売中", "完売", "終了",
];
const EVAL_OPTIONS: EvaluationLevel[] = ["OK", "WARN", "NG"];

interface Props {
  searchParams: Promise<{
    priority?: string;
    status?: string;
    eval?: string;
    ai?: string;
  }>;
}

function filterTag(
  label: string,
  param: string,
  value: string,
  currentParams: Record<string, string>,
  activeStyle: string
) {
  const isActive = currentParams[param] === value;
  const next = { ...currentParams };
  if (isActive) {
    delete next[param]; // 同じ値をクリックで解除
  } else {
    next[param] = value;
  }
  const query = new URLSearchParams(next).toString();
  return { label, href: query ? `?${query}` : "/meeting", isActive, activeStyle };
}

export default async function MeetingPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentParams: Record<string, string> = {};
  if (params.priority) currentParams.priority = params.priority;
  if (params.status)   currentParams.status   = params.status;
  if (params.eval)     currentParams.eval     = params.eval;
  if (params.ai)       currentParams.ai       = params.ai;

  // データ取得・計算
  const allGoods = getAllGoods().map(calcGoods);
  const scoresMap: Record<string, GoodsScore> = Object.fromEntries(
    allGoods.map((g) => [g.id, scoreGoods(g, allGoods)])
  );

  // フィルタリング
  const filtered = allGoods.filter((g: GoodsCalculated) => {
    if (params.priority && g.priority !== (params.priority as Priority)) return false;
    if (params.status   && g.status   !== params.status as GoodsStatus)  return false;
    if (params.ai === "1" && !isAiSuggested(g.memo)) return false;
    return true;
  });

  // 評価フィルターは計算後に適用
  const evaluated = filtered.map((g) => ({ goods: g, evaluation: evaluateGoods(g) }));
  const rows = params.eval
    ? evaluated.filter((r) => r.evaluation.level === (params.eval as EvaluationLevel))
    : evaluated;

  // 並び順：今すぐ作る → 次月候補 → 保留 → 未設定 → 却下
  const PRIORITY_ORDER: Priority[] = ["今すぐ作る", "次月候補", "保留", "未設定", "却下"];
  rows.sort((a, b) => {
    const ai = PRIORITY_ORDER.indexOf(a.goods.priority);
    const bi = PRIORITY_ORDER.indexOf(b.goods.priority);
    return ai - bi;
  });

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">会議用一覧ビュー</h1>
          <p className="mt-1 text-sm text-gray-500">
            企画会議・定例ミーティング向けの比較ビューです。
            優先度・評価・AI由来を一覧で確認できます。
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/meeting/history"
            className="text-sm text-gray-400 hover:text-gray-700"
          >
            過去の会議を見る
          </Link>
          <Link
            href={`/meeting/save${Object.keys(currentParams).length > 0 ? `?${new URLSearchParams(currentParams).toString()}` : ""}`}
            className="rounded bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
          >
            この会議を保存
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-gray-700"
          >
            ← 通常一覧
          </Link>
        </div>
      </div>

      {/* フィルターバー */}
      <div className="rounded border border-gray-200 bg-white p-4 space-y-3">
        {/* 優先度 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 w-16 shrink-0">企画優先度</span>
          <Link
            href={`?${new URLSearchParams({ ...currentParams, ...(currentParams.priority ? {} : {}) }).toString()}`}
            className={`rounded px-2.5 py-1 text-xs font-medium ${
              !params.priority ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={undefined}
          >
            全て
          </Link>
          {PRIORITY_OPTIONS.map((p) => {
            const tag = filterTag(p, "priority", p, currentParams, "bg-red-100 text-red-700");
            return (
              <Link key={p} href={tag.href}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  tag.isActive ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {p}
              </Link>
            );
          })}
        </div>

        {/* ステータス */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 w-16 shrink-0">ステータス</span>
          {STATUS_OPTIONS.map((s) => {
            const tag = filterTag(s, "status", s, currentParams, "");
            return (
              <Link key={s} href={tag.href}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  tag.isActive ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s}
              </Link>
            );
          })}
        </div>

        {/* 評価 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 w-16 shrink-0">評価</span>
          {EVAL_OPTIONS.map((e) => {
            const tag = filterTag(e, "eval", e, currentParams, "");
            const activeColors: Record<EvaluationLevel, string> = {
              OK:   "bg-green-600 text-white",
              WARN: "bg-yellow-500 text-white",
              NG:   "bg-red-600 text-white",
            };
            return (
              <Link key={e} href={tag.href}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  tag.isActive ? activeColors[e] : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {e}
              </Link>
            );
          })}
        </div>

        {/* AI由来 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 w-16 shrink-0">AI由来</span>
          {(() => {
            const isAiActive = params.ai === "1";
            const next = { ...currentParams };
            if (isAiActive) delete next.ai; else next.ai = "1";
            const href = `?${new URLSearchParams(next).toString()}` || "/meeting";
            return (
              <Link href={href}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  isAiActive
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                AI提案のみ
              </Link>
            );
          })()}
        </div>
      </div>

      {/* 件数 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{rows.length}</span> 件
          {rows.length < allGoods.length && (
            <span className="ml-1 text-gray-400">（全 {allGoods.length} 件中）</span>
          )}
        </p>
        {Object.keys(currentParams).length > 0 && (
          <Link href="/meeting" className="text-xs text-blue-600 hover:underline">
            フィルターをリセット
          </Link>
        )}
      </div>

      {/* テーブル */}
      <div className="rounded border border-gray-200 bg-white">
        <MeetingTable rows={rows} scores={scoresMap} />
      </div>
    </div>
  );
}
