import { getAllGoods } from "@/lib/store";
import { getAllCampaigns } from "@/lib/ecCampaignStore";
import { getActiveWrestlers } from "@/lib/wrestlerStore";
import { getAllIncentiveRules } from "@/lib/incentiveRuleStore";
import { getAllGoodsIncentives } from "@/lib/goodsIncentiveStore";
import { recordEcSaleAction } from "./actions";
import EcSalesForm from "./EcSalesForm";

export const metadata = { title: "EC売上を登録 | 九州プロレス グッズ管理" };

interface Props {
  searchParams: Promise<{ bundleId?: string; saved?: string }>;
}

export default async function EcSalesNewPage({ searchParams }: Props) {
  const { bundleId, saved } = await searchParams;

  const goodsList = getAllGoods().filter(
    (g) => !["案出し中", "検討中", "終了"].includes(g.status)
  );

  // 過去3ヶ月〜未来の企画を新しい順で表示（大会紐付けと同じ範囲）
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 3);
  const cutoffYm = cutoff.toISOString().slice(0, 7);
  const campaigns = getAllCampaigns()
    .filter((c) => c.targetMonth >= cutoffYm)
    .sort((a, b) => b.targetMonth.localeCompare(a.targetMonth));

  const wrestlers = getActiveWrestlers().map((w) => ({ id: w.id, name: w.name }));
  const rules = getAllIncentiveRules();
  const goodsIncentives = Object.fromEntries(
    getAllGoodsIncentives().map((x) => [x.goodsId, { category: x.category, links: x.links }])
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">EC売上を登録</h1>
      <EcSalesForm
        goodsList={goodsList}
        campaigns={campaigns}
        wrestlers={wrestlers}
        rules={rules}
        goodsIncentives={goodsIncentives}
        action={recordEcSaleAction}
        initialBundleId={bundleId}
        savedBundle={saved === "bundle"}
      />
    </div>
  );
}
