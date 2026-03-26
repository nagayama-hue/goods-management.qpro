import fs from "fs";
import path from "path";
import type { EcCampaign } from "@/types/ecCampaign";

const DATA_FILE = path.join(process.cwd(), "data", "ec-campaigns.json");

function ensureFile(): void {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

export function getAllCampaigns(): EcCampaign[] {
  ensureFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as EcCampaign[];
}

export function getCampaignById(id: string): EcCampaign | undefined {
  return getAllCampaigns().find((c) => c.id === id);
}

export function saveCampaign(campaign: EcCampaign): void {
  const list = getAllCampaigns();
  const idx = list.findIndex((c) => c.id === campaign.id);
  if (idx >= 0) {
    list[idx] = campaign;
  } else {
    list.push(campaign);
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
}

export function updateCampaignActual(id: string, actual: number): void {
  const list = getAllCampaigns();
  const idx = list.findIndex((c) => c.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], actual };
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
  }
}
