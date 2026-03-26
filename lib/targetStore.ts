import fs   from "fs";
import path from "path";
import type { MonthlyTarget, AnnualTargetSummary } from "@/types/target";

const DATA_FILE = path.join(process.cwd(), "data", "sales-targets.json");

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

export function getAllTargets(): MonthlyTarget[] {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as MonthlyTarget[];
  } catch {
    return [];
  }
}

export function getTarget(year: number, month: number): MonthlyTarget | undefined {
  return getAllTargets().find((t) => t.year === year && t.month === month);
}

export function saveTarget(target: MonthlyTarget): void {
  const list = getAllTargets();
  const idx  = list.findIndex((t) => t.year === target.year && t.month === target.month);
  if (idx >= 0) list[idx] = target;
  else list.push(target);
  list.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
}

/** 年間目標（全月の合計）を返す。未設定月は 0 として扱う */
export function getAnnualTargetSummary(year: number): AnnualTargetSummary {
  const targets = getAllTargets().filter((t) => t.year === year);
  const sum     = (key: keyof Omit<MonthlyTarget, "year" | "month">) =>
    targets.reduce((s, t) => s + t[key], 0);

  const venueHosted    = sum("venueHosted");
  const venueEvent     = sum("venueEvent");
  const ecRegular      = sum("ecRegular");
  const ecSeasonal     = sum("ecSeasonal");
  const ecPreorder     = sum("ecPreorder");
  const ecFc           = sum("ecFc");
  const ecAnniversary  = sum("ecAnniversary");
  const venueTotal     = venueHosted + venueEvent;
  const ecTotal        = ecRegular + ecSeasonal + ecPreorder + ecFc + ecAnniversary;

  return {
    venueHosted, venueEvent, venueTotal,
    ecRegular, ecSeasonal, ecPreorder, ecFc, ecAnniversary, ecTotal,
    grandTotal: venueTotal + ecTotal,
  };
}
