import fs from "fs";
import path from "path";
import type { StockOutflow } from "@/types/stockOutflow";

const DATA_FILE = path.join(process.cwd(), "data", "stockOutflows.json");

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

export function getAllOutflows(): StockOutflow[] {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as StockOutflow[];
}

export function getOutflowsByGoods(goodsId: string): StockOutflow[] {
  return getAllOutflows().filter((o) => o.goodsId === goodsId);
}

export function saveOutflow(outflow: StockOutflow): void {
  const list = getAllOutflows();
  list.push(outflow);
  atomicWrite(DATA_FILE, JSON.stringify(list, null, 2));
}
