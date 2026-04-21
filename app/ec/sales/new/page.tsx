import { getAllGoods } from "@/lib/store";
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">EC売上を登録</h1>
      <EcSalesForm
        goodsList={goodsList}
        action={recordEcSaleAction}
        initialBundleId={bundleId}
        savedBundle={saved === "bundle"}
      />
    </div>
  );
}
