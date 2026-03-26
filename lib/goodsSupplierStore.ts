import fs from "fs";
import path from "path";
import type { GoodsSupplierLink, SupplierRelationType, SupplierPriorityLabel } from "@/types/goodsSupplier";

const DATA_FILE = path.join(process.cwd(), "data", "goods-suppliers.json");

function ensureFile(): void {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

export function getAllLinks(): GoodsSupplierLink[] {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as GoodsSupplierLink[];
  } catch {
    return [];
  }
}

function saveLinks(links: GoodsSupplierLink[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(links, null, 2), "utf-8");
}

/** 商品に紐付くすべてのリンクを返す */
export function getLinksForGoods(goodsId: string): GoodsSupplierLink[] {
  return getAllLinks().filter((l) => l.goodsId === goodsId);
}

/** 取引先に紐付くすべてのリンクを返す */
export function getLinksForSupplier(supplierId: string): GoodsSupplierLink[] {
  return getAllLinks().filter((l) => l.supplierId === supplierId);
}

/** 商品の推奨取引先リンクを返す */
export function getRecommendedLink(goodsId: string): GoodsSupplierLink | undefined {
  return getAllLinks().find(
    (l) => l.goodsId === goodsId && l.relationType === "recommended",
  );
}

/** 候補取引先リンク一覧を優先区分順で返す */
export function getCandidateLinks(goodsId: string): GoodsSupplierLink[] {
  const order: Record<string, number> = { 第一候補: 0, 第二候補: 1, 比較用: 2 };
  return getAllLinks()
    .filter((l) => l.goodsId === goodsId && l.relationType === "candidate")
    .sort((a, b) => (order[a.priorityLabel ?? "比較用"] ?? 2) - (order[b.priorityLabel ?? "比較用"] ?? 2));
}

// ─── 推奨取引先 ────────────────────────────────────────────

/** 推奨取引先を設定（既存があれば置き換え） */
export function setRecommendedSupplier(
  goodsId: string,
  supplierId: string,
  note?: string,
): void {
  const links = getAllLinks().filter(
    (l) => !(l.goodsId === goodsId && l.relationType === "recommended"),
  );
  links.push({
    id:           `gsl_${crypto.randomUUID().slice(0, 8)}`,
    goodsId,
    supplierId,
    relationType: "recommended",
    note:         note || undefined,
    createdAt:    new Date().toISOString(),
  });
  saveLinks(links);
}

/** 推奨取引先の選定メモのみ更新 */
export function updateRecommendedNote(goodsId: string, note: string): void {
  const links = getAllLinks();
  const idx   = links.findIndex(
    (l) => l.goodsId === goodsId && l.relationType === "recommended",
  );
  if (idx < 0) return;
  links[idx] = { ...links[idx], note: note.trim() || undefined };
  saveLinks(links);
}

/** 推奨取引先の設定を解除 */
export function clearRecommendedSupplier(goodsId: string): void {
  saveLinks(
    getAllLinks().filter(
      (l) => !(l.goodsId === goodsId && l.relationType === "recommended"),
    ),
  );
}

// ─── 候補取引先 ────────────────────────────────────────────

/** 候補取引先を追加（既存の場合はスキップ） */
export function addCandidateSupplier(
  goodsId:       string,
  supplierId:    string,
  priorityLabel: SupplierPriorityLabel,
  note?:         string,
): void {
  const links = getAllLinks();
  const exists = links.some(
    (l) =>
      l.goodsId === goodsId &&
      l.supplierId === supplierId &&
      l.relationType === "candidate",
  );
  if (exists) return;
  links.push({
    id:            `gsl_${crypto.randomUUID().slice(0, 8)}`,
    goodsId,
    supplierId,
    relationType:  "candidate",
    priorityLabel,
    note:          note || undefined,
    createdAt:     new Date().toISOString(),
  });
  saveLinks(links);
}

/** 任意のリンクを削除 */
export function removeLink(linkId: string): void {
  saveLinks(getAllLinks().filter((l) => l.id !== linkId));
}

// ─── カスケード削除 ─────────────────────────────────────────

/** 商品削除時：その商品に紐づく全リンクを削除 */
export function removeLinksForGoods(goodsId: string): void {
  saveLinks(getAllLinks().filter((l) => l.goodsId !== goodsId));
}

/** 取引先削除時：その取引先に紐づく全リンクを削除 */
export function removeLinksForSupplier(supplierId: string): void {
  saveLinks(getAllLinks().filter((l) => l.supplierId !== supplierId));
}
