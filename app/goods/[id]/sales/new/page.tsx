import { notFound } from "next/navigation";
import { getGoodsById } from "@/lib/store";
import { getAllEvents } from "@/lib/eventStore";
import { getActiveWrestlers } from "@/lib/wrestlerStore";
import { getAllIncentiveRules } from "@/lib/incentiveRuleStore";
import { getGoodsIncentiveByGoodsId } from "@/lib/goodsIncentiveStore";
import { recordSaleAction } from "./actions";
import SalesNewForm from "./SalesNewForm";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ bundleId?: string; saved?: string }>;
}

export default async function SalesNewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { bundleId, saved } = await searchParams;
  const goods = getGoodsById(id);
  if (!goods) notFound();

  // 過去3ヶ月〜未来の大会を新しい順で表示
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 3);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const events = getAllEvents()
    .filter((e) => e.date >= cutoffStr)
    .sort((a, b) => b.date.localeCompare(a.date));

  const boundAction = recordSaleAction.bind(null, id);

  const wrestlers = getActiveWrestlers().map((w) => ({ id: w.id, name: w.name }));
  const rules = getAllIncentiveRules();
  const inc = getGoodsIncentiveByGoodsId(id);
  const goodsIncentive = inc ? { category: inc.category, links: inc.links } : null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">売上を登録</h1>
      <SalesNewForm
        goods={goods}
        events={events}
        wrestlers={wrestlers}
        rules={rules}
        goodsIncentive={goodsIncentive}
        action={boundAction}
        initialBundleId={bundleId}
        savedBundle={saved === "bundle"}
      />
    </div>
  );
}
