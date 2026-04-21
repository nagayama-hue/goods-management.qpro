import { notFound } from "next/navigation";
import { getEventById } from "@/lib/eventStore";
import { getAllGoods } from "@/lib/store";
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">物販実績を入力</h1>
      <EventSalesForm
        event={event}
        goodsList={goodsList}
        action={boundAction}
        initialBundleId={bundleId}
        savedBundle={saved === "bundle"}
      />
    </div>
  );
}
