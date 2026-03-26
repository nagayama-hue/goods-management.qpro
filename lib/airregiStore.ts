import fs   from "fs";
import path from "path";
import type {
  AirregiProductRecord,
  AirregiStockRecord,
  AirregiSalesRecord,
} from "@/types/airregi";

const DATA_DIR      = path.join(process.cwd(), "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "airregi-products.json");
const STOCKS_FILE   = path.join(DATA_DIR, "airregi-stocks.json");
const SALES_FILE    = path.join(DATA_DIR, "airregi-sales.json");

function readJson<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T[];
  } catch {
    return [];
  }
}

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ─── 商品データ ──────────────────────────────────────────────────────────

export function getAllAirregiProducts(): AirregiProductRecord[] {
  return readJson<AirregiProductRecord>(PRODUCTS_FILE);
}

export function saveAllAirregiProducts(records: AirregiProductRecord[]): void {
  writeJson(PRODUCTS_FILE, records);
}

export function getAirregiProductByCode(code: string): AirregiProductRecord | undefined {
  return getAllAirregiProducts().find((p) => p.productCode === code);
}

// ─── 在庫データ ──────────────────────────────────────────────────────────

export function getAllAirregiStocks(): AirregiStockRecord[] {
  return readJson<AirregiStockRecord>(STOCKS_FILE);
}

export function saveAllAirregiStocks(records: AirregiStockRecord[]): void {
  writeJson(STOCKS_FILE, records);
}

export function getAirregiStockByCode(code: string): AirregiStockRecord | undefined {
  return getAllAirregiStocks().find((s) => s.productCode === code);
}

// ─── 売上データ ──────────────────────────────────────────────────────────

export function getAllAirregiSales(): AirregiSalesRecord[] {
  return readJson<AirregiSalesRecord>(SALES_FILE);
}

export function saveAllAirregiSales(records: AirregiSalesRecord[]): void {
  writeJson(SALES_FILE, records);
}

export function getAirregiSalesByCode(code: string): AirregiSalesRecord | undefined {
  return getAllAirregiSales().find((s) => s.productCode === code);
}
