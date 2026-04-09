import { notFound } from "next/navigation";
import { getSalesRecordById } from "@/lib/salesRecordStore";
import { getAllGoods } from "@/lib/store";
import { updateSaleAction } from "./actions";
import SalesEditForm from "./SalesEditForm";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function EditSalePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { from } = await searchParams;
  const returnTo = from ?? "/sales";

  const record = getSalesRecordById(id);
  if (!record) notFound();

  const goodsList = getAllGoods().filter(
    (g) => !["案出し中", "検討中", "終了"].includes(g.status) || g.id === record.goodsId
  );

  const boundAction = updateSaleAction.bind(null, id, returnTo);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">売上実績を編集</h1>
        <p className="mt-1 text-sm text-gray-500">
          在庫・販売数は差分で自動調整されます。
        </p>
      </div>
      <SalesEditForm record={record} goodsList={goodsList} returnTo={returnTo} action={boundAction} />
    </div>
  );
}
