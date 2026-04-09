import fs from "fs";
import path from "path";
import type { Goods } from "@/types/goods";

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

export function getAllGoods(): Goods[] {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as Goods[];
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
