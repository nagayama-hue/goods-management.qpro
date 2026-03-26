import fs   from "fs";
import path from "path";
import type { EventTarget } from "@/types/event";

const DATA_FILE = path.join(process.cwd(), "data", "events.json");

function ensureFile(): void {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
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
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
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
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
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
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
}
