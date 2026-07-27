import fs from "fs";
import path from "path";
import type { Wrestler } from "@/types/wrestler";

const DATA_FILE = path.join(process.cwd(), "data", "wrestlers.json");

/**
 * 初期シード（14名）。本番の Railway Volume には git のシードファイルが届かないため、
 * ファイルが存在しない環境では初回アクセス時にここから自動生成する。
 */
const SEED_WRESTLERS: Wrestler[] = [
  { id: "w01", name: "筑前りょう太", active: true, createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "w02", name: "玄海", active: true, createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "w03", name: "佐々木日田丸", active: true, createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "w04", name: "阿蘇山", active: true, createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "w05", name: "ばってん", active: true, createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "w06", name: "桜島なおき", active: true, createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "w07", name: "野﨑広大", active: true, createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "w08", name: "TAJIRI", active: true, createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "w09", name: "ジェット・ウィー", active: true, createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "w10", name: "シマ重野", active: true, createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "w11", name: "梅紅陽", active: true, createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "w12", name: "山口恒次", active: true, createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "w13", name: "関根泰誠", active: true, createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "w14", name: "マッハ隼人", active: true, createdAt: "2026-07-28T00:00:00.000Z" },
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
    fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_WRESTLERS, null, 2), "utf-8");
  }
}

export function getAllWrestlers(): Wrestler[] {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as Wrestler[];
}

export function getActiveWrestlers(): Wrestler[] {
  return getAllWrestlers().filter((w) => w.active);
}

export function getWrestlerById(id: string): Wrestler | undefined {
  return getAllWrestlers().find((w) => w.id === id);
}

export function saveWrestler(wrestler: Wrestler): void {
  const list = getAllWrestlers();
  const index = list.findIndex((w) => w.id === wrestler.id);
  if (index >= 0) {
    list[index] = wrestler;
  } else {
    list.push(wrestler);
  }
  atomicWrite(DATA_FILE, JSON.stringify(list, null, 2));
}
