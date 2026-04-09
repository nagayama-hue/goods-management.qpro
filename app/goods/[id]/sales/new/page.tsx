import { notFound } from "next/navigation";
import { getGoodsById } from "@/lib/store";
import { getAllEvents } from "@/lib/eventStore";
import { recordSaleAction } from "./actions";
import SalesNewForm from "./SalesNewForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SalesNewPage({ params }: Props) {
  const { id } = await params;
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">売上を登録</h1>
      <SalesNewForm goods={goods} events={events} action={boundAction} />
    </div>
  );
}
