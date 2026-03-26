import fs from "fs";
import path from "path";
import type { SuggestionHistory } from "@/types/suggestionHistory";

const HISTORY_PATH = path.join(process.cwd(), "data", "suggestion-history.json");

export function getAllHistory(): SuggestionHistory[] {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8")) as SuggestionHistory[];
  } catch {
    return [];
  }
}

export function getHistoryById(id: string): SuggestionHistory | null {
  return getAllHistory().find((h) => h.id === id) ?? null;
}

/** 履歴を先頭に追加して保存 */
export function addHistory(history: SuggestionHistory): void {
  const all = getAllHistory();
  all.unshift(history);
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(all, null, 2));
}

/** 提案案に商品IDを紐付ける */
export function linkGoodsToHistory(
  historyId: string,
  suggestionId: string,
  goodsId: string
): void {
  const all = getAllHistory();
  const historyIdx = all.findIndex((h) => h.id === historyId);
  if (historyIdx === -1) return;

  const suggIdx = all[historyIdx].suggestions.findIndex((s) => s.id === suggestionId);
  if (suggIdx === -1) return;

  all[historyIdx].suggestions[suggIdx].registeredGoodsId = goodsId;
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(all, null, 2));
}
