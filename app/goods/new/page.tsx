import GoodsForm from "@/components/GoodsForm";
import { createGoods } from "./actions";

export default function NewGoodsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">商品登録</h1>
      <GoodsForm action={createGoods} submitLabel="登録する" cancelHref="/" />
    </div>
  );
}
