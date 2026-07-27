import { notFound } from "next/navigation";
import { getEventById } from "@/lib/eventStore";
import { getAllGoods } from "@/lib/store";
import { getActiveWrestlers } from "@/lib/wrestlerStore";
import { getAllIncentiveRules } from "@/lib/incentiveRuleStore";
import { getAllGoodsIncentives } from "@/lib/goodsIncentiveStore";
import { recordEventSaleAction } from "./actions";
import EventSalesForm from "./EventSalesForm";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ bundleId?: string; saved?: string }>;
}

export default async function EventSalesNewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { bundleId, saved } = await searchParams;
  const event = getEventById(id);
  if (!event) notFound();

  const goodsList = getAllGoods().filter(
    (g) => !["案出し中", "検討中", "終了"].includes(g.status)
  );

  const boundAction = recordEventSaleAction.bind(null, id);

  const wrestlers = getActiveWrestlers().map((w) => ({ id: w.id, name: w.name }));
  const rules = getAllIncentiveRules();
  const goodsIncentives = Object.fromEntries(
    getAllGoodsIncentives().map((x) => [x.goodsId, { category: x.category, links: x.links }])
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">物販実績を入力</h1>
      <EventSalesForm
        event={event}
        goodsList={goodsList}
        wrestlers={wrestlers}
        rules={rules}
        goodsIncentives={goodsIncentives}
        action={boundAction}
        initialBundleId={bundleId}
        savedBundle={saved === "bundle"}
      />
    </div>
  );
}
