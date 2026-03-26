"use server";

import { revalidatePath }                           from "next/cache";
import { getAirregiConfig, saveAirregiConfig }      from "@/lib/airregiConfigStore";
import { testAirregiConnection }                    from "@/lib/airregi/client";

// ─── 型 ──────────────────────────────────────────────────────────────────────

export type ConfigActionResult = {
  action:  "save" | "test";
  ok:      boolean;
  message: string;
};

// ─── 接続設定の保存 / 接続テスト ─────────────────────────────────────────────

/**
 * フォームの _action フィールドで "save" / "test" を切り替える。
 * apiKey・apiToken は空送信時は既存値を維持する（変更しない場合は空欄のまま送信）。
 */
export async function configAction(
  _prev: ConfigActionResult | null,
  formData: FormData
): Promise<ConfigActionResult> {
  const action    = formData.get("_action") as "save" | "test";
  const apiKey    = formData.get("apiKey")?.toString().trim()   ?? "";
  const apiToken  = formData.get("apiToken")?.toString().trim() ?? "";
  const storeId   = formData.get("storeId")?.toString().trim()  ?? "";
  const isEnabled = formData.get("isEnabled") === "true";

  const current = getAirregiConfig();

  // 空欄なら既存値を維持
  const resolvedKey   = apiKey   || current.apiKey;
  const resolvedToken = apiToken || current.apiToken;
  const resolvedStore = storeId  || (current.storeId ?? "");

  // ── 接続テスト ──────────────────────────────────────────────────────────
  if (action === "test") {
    // TODO: Airレジ API仕様（ベースURL・エンドポイント）確認後に再開する
    // 現在は接続確認を停止中。設定値の保存のみ有効。
    return {
      action:  "test",
      ok:      false,
      message: "接続確認は現在停止中です。Airレジ側の連携仕様確認後に再開します。",
    };
  }

  // ── 設定保存 ────────────────────────────────────────────────────────────
  // キーが変わった場合は接続状態を「確認前」にリセット
  const keyChanged = resolvedKey !== current.apiKey || resolvedToken !== current.apiToken;
  const newStatus  =
    !resolvedKey || !resolvedToken ? "未設定" as const :
    keyChanged                     ? "確認前" as const :
    current.connectionStatus;

  saveAirregiConfig({
    ...current,
    apiKey:           resolvedKey,
    apiToken:         resolvedToken,
    storeId:          resolvedStore || undefined,
    isEnabled,
    connectionStatus: newStatus,
    lastCheckedAt:    keyChanged ? undefined : current.lastCheckedAt,
    lastErrorMessage: keyChanged ? undefined : current.lastErrorMessage,
  });
  revalidatePath("/airregi");
  return { action: "save", ok: true, message: "設定を保存しました" };
}
