import fs from "fs";
import path from "path";
import type { Goods, GoodsVariant } from "@/types/goods";

const DATA_FILE = path.join(process.cwd(), "data", "goods.json");

function atomicWrite(filePath: string, data: string): void {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, data, "utf-8");
  fs.renameSync(tmp, filePath);
}

function ensureDataFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

/**
 * バリエーション未設定の商品に「標準 / FREE」デフォルトバリアントを注入する。
 * sales.productionCount / salesCount から数量を導出するため既存データと整合する。
 * 在庫減算ロジックを variant ベースで統一するための内部処理。
 */
function ensureDefaultVariant(goods: Goods): Goods {
  if (goods.variants && goods.variants.length > 0) return goods;
  const defaultVariant: GoodsVariant = {
    id: `v-std-${goods.id}`,
    color: "標準",
    size: "FREE",
    plannedQuantity: goods.sales.productionCount,
    stockQuantity: Math.max(0, goods.sales.productionCount - goods.sales.salesCount),
    soldQuantity: goods.sales.salesCount,
  };
  return { ...goods, variants: [defaultVariant] };
}

export function getAllGoods(): Goods[] {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return (JSON.parse(raw) as Goods[]).map(ensureDefaultVariant);
}

export function getGoodsById(id: string): Goods | undefined {
  const list = getAllGoods();
  return list.find((g) => g.id === id);
}

export function saveGoods(goods: Goods): void {
  const list = getAllGoods();
  const index = list.findIndex((g) => g.id === goods.id);
  if (index >= 0) {
    list[index] = goods;
  } else {
    list.push(goods);
  }
  atomicWrite(DATA_FILE, JSON.stringify(list, null, 2));
}

export function deleteGoods(id: string): void {
  const list = getAllGoods();
  const updated = list.filter((g) => g.id !== id);
  atomicWrite(DATA_FILE, JSON.stringify(updated, null, 2));
}
