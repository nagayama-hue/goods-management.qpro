import { getAllGoods } from "@/lib/store";
import { getActiveWrestlers } from "@/lib/wrestlerStore";
import { getAllIncentiveRules } from "@/lib/incentiveRuleStore";
import { getAllEvents } from "@/lib/eventStore";
import { recordIncentiveSaleAction } from "./actions";
import IncentiveSaleForm from "./IncentiveSaleForm";

export const metadata = { title: "インセンティブ売上を登録 | 九州プロレス グッズ管理" };

export default async function IncentiveSaleNewPage() {
  const goodsList = getAllGoods()
    .filter((g) => !["案出し中", "検討中", "終了"].includes(g.status))
    .map((g) => ({
      id: g.id,
      name: g.name,
      sellingPrice: g.sales.sellingPrice,
      variants: (g.variants ?? []).map((v) => ({
        id: v.id,
        color: v.color,
        size: v.size,
        stockQuantity: v.stockQuantity,
        sellingPrice: v.sellingPrice,
        unitCost: v.unitCost,
      })),
    }));

  const wrestlers = getActiveWrestlers().map((w) => ({ id: w.id, name: w.name }));
  const rules = getAllIncentiveRules();

  // 直近3ヶ月〜未来の大会（会場販売の任意紐付け用）
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 3);
  const cutoffYm = cutoff.toISOString().slice(0, 7);
  const events = getAllEvents()
    .filter((e) => e.date.slice(0, 7) >= cutoffYm)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => ({ id: e.id, name: e.name, date: e.date }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">インセンティブ売上を登録</h1>
        <p className="mt-1 text-sm text-gray-500">
          商品・選手・売れ方を選ぶとインセンティブ額が表示されます。登録すると通常の売上実績として計上され、在庫が減ります。
        </p>
      </div>
      <IncentiveSaleForm
        goodsList={goodsList}
        wrestlers={wrestlers}
        events={events}
        rules={rules}
        action={recordIncentiveSaleAction}
      />
    </div>
  );
}
