/**
 * Airレジ API接続設定の永続化。
 * /data/airregi-config.json に保存。APIキー・トークンを含むため
 * サーバー側でのみ読み書きし、クライアントには一切送信しない。
 */
import fs   from "fs";
import path from "path";
import type { AirregiConfig } from "@/types/airregi";

const CONFIG_FILE = path.join(process.cwd(), "data", "airregi-config.json");

const DEFAULTS: AirregiConfig = {
  apiKey:           "",
  apiToken:         "",
  storeId:          "",
  isEnabled:        false,
  connectionStatus: "未設定",
};

export function getAirregiConfig(): AirregiConfig {
  if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8")) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAirregiConfig(config: AirregiConfig): void {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}
