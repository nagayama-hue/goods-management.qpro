import fs   from "fs";
import path from "path";
import type { EventTarget } from "@/types/event";

const DATA_FILE = path.join(process.cwd(), "data", "events.json");

function ensureFile(): void {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

function atomicWrite(data: string): void {
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, data, "utf-8");
  fs.renameSync(tmp, DATA_FILE);
}

export function getAllEvents(): EventTarget[] {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as EventTarget[];
  } catch {
    return [];
  }
}

export function getEventById(id: string): EventTarget | undefined {
  return getAllEvents().find((e) => e.id === id);
}

export function createEvent(data: Omit<EventTarget, "id">): EventTarget {
  const list = getAllEvents();
  const id   = `ev_${crypto.randomUUID().slice(0, 8)}`;
  const newEvent: EventTarget = { id, ...data };
  list.push(newEvent);
  list.sort((a, b) => a.date.localeCompare(b.date));
  atomicWrite(JSON.stringify(list, null, 2));
  return newEvent;
}

export function updateEvent(
  id: string,
  data: Omit<EventTarget, "id" | "actual" | "actualCapacity">,
): void {
  const list = getAllEvents();
  const idx  = list.findIndex((e) => e.id === id);
  if (idx < 0) return;
  // actual / actualCapacity は保持、その他を上書き
  const existing = list[idx];
  const updated: EventTarget = { id, ...data };
  if (existing.actual          !== undefined) updated.actual          = existing.actual;
  if (existing.actualCapacity  !== undefined) updated.actualCapacity  = existing.actualCapacity;
  // capacity が未指定なら削除
  if (!data.capacity) delete updated.capacity;
  list[idx] = updated;
  atomicWrite(JSON.stringify(list, null, 2));
}

/** 物販売上を大会の actual に加算する（未設定の場合は初期値として設定） */
export function addToEventActual(id: string, amount: number): void {
  const list = getAllEvents();
  const idx  = list.findIndex((e) => e.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], actual: (list[idx].actual ?? 0) + amount };
  atomicWrite(JSON.stringify(list, null, 2));
}

export function updateEventActual(
  id:              string,
  actual:          number | undefined,
  actualCapacity:  number | undefined,
): void {
  const list = getAllEvents();
  const idx  = list.findIndex((e) => e.id === id);
  if (idx < 0) return;

  let updated = { ...list[idx] };

  // 実績売上
  if (actual === undefined) {
    const { actual: _a, ...rest } = updated;
    updated = rest as EventTarget;
  } else {
    updated.actual = actual;
  }

  // 実績動員
  if (actualCapacity === undefined) {
    const { actualCapacity: _c, ...rest } = updated;
    updated = rest as EventTarget;
  } else {
    updated.actualCapacity = actualCapacity;
  }

  list[idx] = updated;
  atomicWrite(JSON.stringify(list, null, 2));
}
