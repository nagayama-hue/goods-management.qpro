import Link from "next/link";
import { getAllGoods } from "@/lib/store";
import { calcGoods } from "@/lib/calculations";
import { evaluateGoods } from "@/lib/evaluation";
import { isAiSuggested } from "@/lib/parseAiMemo";
import MeetingSaveForm from "./MeetingSaveForm";
import type { Priority, GoodsStatus, EvaluationLevel } from "@/types/goods";

interface Props {
  searchParams: Promise<{
    priority?: string;
    status?:   string;
    eval?:     string;
    ai?:       string;
  }>;
}

export default async function MeetingSavePage({ searchParams }: Props) {
  const params = await searchParams;

  // 会議ビューと同じフィルタ・ソートロジック
  const allGoods = getAllGoods().map(calcGoods);

  const filtered = allGoods.filter((g) => {
    if (params.priority && g.priority !== (params.priority as Priority)) return false;
    if (params.status   && g.status   !== (params.status   as GoodsStatus)) return false;
    if (params.ai === "1" && !isAiSuggested(g.memo)) return false;
    return true;
  });

  const evaluated = filtered.map((g) => ({ goods: g, evaluation: evaluateGoods(g) }));
  const rows = params.eval
    ? evaluated.filter((r) => r.evaluation.level === (params.eval as EvaluationLevel))
    : evaluated;

  const PRIORITY_ORDER: Priority[] = ["今すぐ作る", "次月候補", "保留", "未設定", "却下"];
  rows.sort(
    (a, b) =>
      PRIORITY_ORDER.indexOf(a.goods.priority) -
      PRIORITY_ORDER.indexOf(b.goods.priority)
  );

  // 戻り先 URL
  const backParams = new URLSearchParams();
  if (params.priority) backParams.set("priority", params.priority);
  if (params.status)   backParams.set("status",   params.status);
  if (params.eval)     backParams.set("eval",     params.eval);
  if (params.ai)       backParams.set("ai",       params.ai);
  const backHref = `/meeting${backParams.toString() ? `?${backParams.toString()}` : ""}`;

  // filterParams を JSON にシリアライズして Client Component へ渡す
  const filterParamsJson = JSON.stringify(
    Object.fromEntries(
      Object.entries({
        priority: params.priority,
        status:   params.status,
        eval:     params.eval,
        ai:       params.ai,
      }).filter(([, v]) => v !== undefined)
    )
  );

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">会議を記録する</h1>
          <p className="mt-1 text-sm text-gray-500">
            現在の絞り込み条件で表示中の{" "}
            <span className="font-medium text-gray-900">{rows.length} 件</span>{" "}
            を記録します。
          </p>
        </div>
        <Link href={backHref} className="shrink-0 text-sm text-gray-400 hover:text-gray-700">
          ← 会議ビューに戻る
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded border border-dashed border-gray-300 py-16 text-center text-sm text-gray-400">
          対象の商品がありません。
          <br />
          <Link href="/meeting" className="mt-2 inline-block text-blue-500 hover:underline">
            会議ビューに戻る
          </Link>
        </div>
      ) : (
        <MeetingSaveForm
          rows={rows}
          today={today}
          backHref={backHref}
          filterParamsJson={filterParamsJson}
        />
      )}
    </div>
  );
}
