import fs from "fs";
import path from "path";
import type { GoodsSuggestion } from "@/types/suggestion";

const FILE = path.join(process.cwd(), "data", "monthly-suggestion.json");

export interface MonthlySuggestionData {
  generatedAt: string;   // ISO datetime
  targetMonth: string;   // "2026-03"
  suggestions: GoodsSuggestion[];
}

export function loadMonthlySuggestion(): MonthlySuggestionData | null {
  if (!fs.existsSync(FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as MonthlySuggestionData;
  } catch {
    return null;
  }
}

export function saveMonthlySuggestion(data: MonthlySuggestionData): void {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf-8");
}
