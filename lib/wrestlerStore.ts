import fs from "fs";
import path from "path";
import type { Wrestler } from "@/types/wrestler";

const DATA_FILE = path.join(process.cwd(), "data", "wrestlers.json");

function atomicWrite(filePath: string, data: string): void {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, data, "utf-8");
  fs.renameSync(tmp, filePath);
}

function ensureDataFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
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
