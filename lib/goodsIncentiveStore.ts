import fs from "fs";
import path from "path";
import type { GoodsIncentive } from "@/types/goodsIncentive";

const DATA_FILE = path.join(process.cwd(), "data", "goods-incentives.json");

function atomicWrite(filePath: string, data: string): void {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, data, "utf-8");
  fs.renameSync(tmp, filePath);
}

function ensureDataFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

export function getAllGoodsIncentives(): GoodsIncentive[] {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as GoodsIncentive[];
}

export function getGoodsIncentiveByGoodsId(goodsId: string): GoodsIncentive | undefined {
  return getAllGoodsIncentives().find((x) => x.goodsId === goodsId);
}

/** goodsId をキーに upsert */
export function saveGoodsIncentive(entry: GoodsIncentive): void {
  const list = getAllGoodsIncentives();
  const index = list.findIndex((x) => x.goodsId === entry.goodsId);
  if (index >= 0) {
    list[index] = entry;
  } else {
    list.push(entry);
  }
  atomicWrite(DATA_FILE, JSON.stringify(list, null, 2));
}

export function deleteGoodsIncentive(goodsId: string): void {
  const list = getAllGoodsIncentives().filter((x) => x.goodsId !== goodsId);
  atomicWrite(DATA_FILE, JSON.stringify(list, null, 2));
}
