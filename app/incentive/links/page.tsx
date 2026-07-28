import { getAllGoods } from "@/lib/store";
import IncentiveTabs from "../IncentiveTabs";
import { getActiveWrestlers } from "@/lib/wrestlerStore";
import { getAllGoodsIncentives } from "@/lib/goodsIncentiveStore";
import { saveGoodsIncentiveAction, clearGoodsIncentiveAction, autoSuggestAction } from "./actions";
import IncentiveLinksTable from "./IncentiveLinksTable";

export const metadata = { title: "商品×選手 紐付け | 九州プロレス グッズ管理" };

interface Props {
  searchParams: Promise<{ suggested?: string; unset?: string; q?: string }>;
}

export default async function IncentiveLinksPage({ searchParams }: Props) {
  const { suggested, unset, q } = await searchParams;
  const onlyUnset = unset === "1";
  const query = (q ?? "").trim();

  const wrestlers = getActiveWrestlers();
  const incentives = new Map(getAllGoodsIncentives().map((x) => [x.goodsId, x]));

  const allGoods = getAllGoods();
  const rows = allGoods
    .map((g) => {
      const inc = incentives.get(g.id);
      return {
        id: g.id,
        name: g.name,
        category: inc?.category ?? null,
        links: inc?.links ?? [],
      };
    })
    .filter((r) => (!onlyUnset || r.category === null))
    .filter((r) => (!query || r.name.includes(query)));

  const unsetCount = allGoods.filter((g) => !incentives.has(g.id)).length;

  return (
    <div className="space-y-6">
      {suggested !== undefined && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ 商品名から {suggested} 件を自動推定しました。内容を確認し、必要に応じて修正してください。
        </div>
      )}

      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">インセンティブ管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          商品ごとのインセンティブ区分と帰属選手を設定します。会場・ECの5%対象は「個人グッズ」のみです。
        </p>
      </div>

      <IncentiveTabs active="/incentive/links" />

      {/* ツールバー */}
      <div className="flex flex-wrap items-center gap-3 rounded border border-gray-200 bg-white px-4 py-3">
        <form action={autoSuggestAction}>
          <button
            type="submit"
            className="rounded border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
          >
            商品名から自動推定
          </button>
        </form>
        <span className="text-xs text-gray-400">
          未設定の商品のみが対象です（設定済みは上書きしません）
        </span>
        <form method="GET" className="ml-auto flex items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="商品名で絞り込み"
            className="rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
          />
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input type="checkbox" name="unset" value="1" defaultChecked={onlyUnset} />
            未設定のみ（{unsetCount}件）
          </label>
          <button type="submit" className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
            絞り込む
          </button>
        </form>
      </div>

      <IncentiveLinksTable
        goods={rows}
        wrestlers={wrestlers.map((w) => ({ id: w.id, name: w.name }))}
        saveAction={saveGoodsIncentiveAction}
        clearAction={clearGoodsIncentiveAction}
      />

      <p className="text-xs text-gray-400">
        ※ 個人グッズ=選手1名100%（会場・EC 5%）。複数選手・タッグ商品=売上の10%を紐付け選手の按分%で分配
        （2人均等なら5%ずつ。按分は合計100%）。バリエーション商品（同一商品で選手別デザイン）は売上登録時の
        「帰属選手の指定」で上書きできます。
      </p>
    </div>
  );
}
