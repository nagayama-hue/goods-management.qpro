import fs from "fs";
import path from "path";
import type { MeetingHistory } from "@/types/meeting";

const DATA_FILE = path.join(process.cwd(), "data", "meeting-history.json");

function ensureDataFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

export function getAllMeetings(): MeetingHistory[] {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as MeetingHistory[];
}

export function getMeetingById(id: string): MeetingHistory | undefined {
  return getAllMeetings().find((m) => m.id === id);
}

export function saveMeeting(meeting: MeetingHistory): void {
  const list = getAllMeetings();
  list.push(meeting);
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
}
