import fs from "fs";
import path from "path";
import type { Stocktake } from "@/types/stocktake";

const DATA_FILE = path.join(process.cwd(), "data", "stocktakes.json");

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

export function getAllStocktakes(): Stocktake[] {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as Stocktake[];
}

export function getStocktakeById(id: string): Stocktake | undefined {
  return getAllStocktakes().find((s) => s.id === id);
}

/** 進行中（下書き）の棚卸し。同時に複数は持たない運用 */
export function getDraftStocktake(): Stocktake | undefined {
  return getAllStocktakes().find((s) => s.status === "draft");
}

export function saveStocktake(stocktake: Stocktake): void {
  const list = getAllStocktakes();
  const index = list.findIndex((s) => s.id === stocktake.id);
  if (index >= 0) {
    list[index] = stocktake;
  } else {
    list.push(stocktake);
  }
  atomicWrite(DATA_FILE, JSON.stringify(list, null, 2));
}

export function deleteStocktake(id: string): void {
  const list = getAllStocktakes().filter((s) => s.id !== id);
  atomicWrite(DATA_FILE, JSON.stringify(list, null, 2));
}
