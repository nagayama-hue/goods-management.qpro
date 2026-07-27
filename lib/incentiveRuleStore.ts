import fs from "fs";
import path from "path";
import type { IncentiveRule } from "@/types/incentiveRule";

const DATA_FILE = path.join(process.cwd(), "data", "incentive-rules.json");

/**
 * 初期シード（社内規程 2021.11 制定＋例外）。
 * 本番の Railway Volume には git のシードファイルが届かないため、
 * ファイルが存在しない環境では初回アクセス時にここから自動生成する。
 * w13=関根泰誠 / w14=マッハ隼人（選手マスタのシードIDと対応）
 */
const SEED_RULES: IncentiveRule[] = [
  { id: "rule-default-venue", wrestlerId: null, channel: "venue", basis: "sales", value: 5, startDate: "2021-11-01", note: "社内規程2021.11（会場・個人グッズ）" },
  { id: "rule-default-ec", wrestlerId: null, channel: "ec", basis: "sales", value: 5, startDate: "2021-11-01", note: "社内規程2021.11（EC・個人グッズ）" },
  { id: "rule-default-hand", wrestlerId: null, channel: "hand", basis: "sales", value: 10, startDate: "2021-11-01", note: "社内規程2021.11（手売り・全グッズ）" },
  { id: "rule-w14-profit80", wrestlerId: "w14", channel: "all", basis: "profit", value: 80, startDate: "2021-11-01", note: "例外：マッハ隼人は粗利の80%（適用範囲・開始日 要確認）" },
  { id: "rule-w13-profit80", wrestlerId: "w13", channel: "all", basis: "profit", value: 80, startDate: "2021-11-01", note: "例外：関根泰誠は粗利の80%（適用範囲・開始日 要確認）" },
];

function atomicWrite(filePath: string, data: string): void {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, data, "utf-8");
  fs.renameSync(tmp, filePath);
}

function ensureDataFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_RULES, null, 2), "utf-8");
  }
}

export function getAllIncentiveRules(): IncentiveRule[] {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as IncentiveRule[];
}

export function saveIncentiveRule(rule: IncentiveRule): void {
  const list = getAllIncentiveRules();
  const index = list.findIndex((r) => r.id === rule.id);
  if (index >= 0) {
    list[index] = rule;
  } else {
    list.push(rule);
  }
  atomicWrite(DATA_FILE, JSON.stringify(list, null, 2));
}

export function deleteIncentiveRule(id: string): void {
  const list = getAllIncentiveRules().filter((r) => r.id !== id);
  atomicWrite(DATA_FILE, JSON.stringify(list, null, 2));
}
