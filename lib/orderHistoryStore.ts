import fs from "fs";
import path from "path";
import type { OrderHistory } from "@/types/goodsSupplier";

const DATA_FILE = path.join(process.cwd(), "data", "order-history.json");

function ensureFile(): void {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

export function getAllOrderHistory(): OrderHistory[] {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as OrderHistory[];
  } catch {
    return [];
  }
}

/** 商品に紐づく発注履歴を発注日降順で返す */
export function getOrderHistoryForGoods(goodsId: string): OrderHistory[] {
  return getAllOrderHistory()
    .filter((h) => h.goodsId === goodsId)
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
}

/** 取引先に紐づく発注履歴を返す */
export function getOrderHistoryForSupplier(supplierId: string): OrderHistory[] {
  return getAllOrderHistory()
    .filter((h) => h.supplierId === supplierId)
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
}

/** 発注履歴を追加する */
export function addOrderHistory(
  data: Omit<OrderHistory, "id" | "createdAt">,
): OrderHistory {
  const list = getAllOrderHistory();
  const record: OrderHistory = {
    id:        `oh_${crypto.randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
    ...data,
  };
  list.push(record);
  list.sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
  return record;
}

/** 商品削除時の履歴クリーンアップ */
export function removeOrderHistoryForGoods(goodsId: string): void {
  const list = getAllOrderHistory().filter((h) => h.goodsId !== goodsId);
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
}
