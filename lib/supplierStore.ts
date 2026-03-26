import fs   from "fs";
import path from "path";
import type { Supplier } from "@/types/supplier";

const DATA_FILE = path.join(process.cwd(), "data", "suppliers.json");

function ensureFile(): void {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

export function getAllSuppliers(): Supplier[] {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as Supplier[];
  } catch {
    return [];
  }
}

export function getSupplierById(id: string): Supplier | undefined {
  return getAllSuppliers().find((s) => s.id === id);
}

export function createSupplier(data: Omit<Supplier, "id" | "createdAt">): Supplier {
  const list = getAllSuppliers();
  const newSupplier: Supplier = {
    id: `sup_${crypto.randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
    ...data,
  };
  list.push(newSupplier);
  // 評価降順で保存
  list.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
  return newSupplier;
}

export function updateSupplier(id: string, data: Omit<Supplier, "id" | "createdAt">): void {
  const list = getAllSuppliers();
  const idx  = list.findIndex((s) => s.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], ...data };
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
}

export function deleteSupplier(id: string): void {
  const list = getAllSuppliers().filter((s) => s.id !== id);
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
}
