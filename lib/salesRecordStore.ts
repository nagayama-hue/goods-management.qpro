import fs from "fs";
import path from "path";
import type { SalesRecord } from "@/types/salesRecord";

const DATA_FILE = path.join(process.cwd(), "data", "sales-records.json");

function readAll(): SalesRecord[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as SalesRecord[];
  } catch {
    return [];
  }
}

function writeAll(records: SalesRecord[]): void {
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(records, null, 2), "utf-8");
  fs.renameSync(tmp, DATA_FILE);
}

export function getAllSalesRecords(): SalesRecord[] {
  return readAll();
}

export function getSalesRecordsByGoods(goodsId: string): SalesRecord[] {
  return readAll().filter((r) => r.goodsId === goodsId);
}

export function getSalesRecordsByEvent(eventId: string): SalesRecord[] {
  return readAll().filter((r) => r.eventId === eventId);
}

export function getSalesRecordById(id: string): SalesRecord | undefined {
  return readAll().find((r) => r.id === id);
}

export function addSalesRecord(record: SalesRecord): void {
  const records = readAll();
  records.push(record);
  writeAll(records);
}

export function updateSalesRecord(updated: SalesRecord): void {
  const records = readAll();
  const idx = records.findIndex((r) => r.id === updated.id);
  if (idx < 0) return;
  records[idx] = updated;
  writeAll(records);
}

export function deleteSalesRecord(id: string): void {
  const records = readAll().filter((r) => r.id !== id);
  writeAll(records);
}
