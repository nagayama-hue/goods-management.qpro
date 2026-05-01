import { notFound } from "next/navigation";
import { getGoodsById } from "@/lib/store";
import { createOutflow } from "./actions";
import OutflowForm from "./OutflowForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OutflowNewPage({ params }: Props) {
  const { id } = await params;
  const goods = getGoodsById(id);
  if (!goods) notFound();

  const boundAction = createOutflow.bind(null, id);

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">出庫を登録</h1>
        <p className="mt-1 text-sm text-gray-500">
          贈答・サンプルなど売上計上しない在庫の出庫を記録します。
        </p>
      </div>
      <OutflowForm goods={goods} action={boundAction} />
    </div>
  );
}
