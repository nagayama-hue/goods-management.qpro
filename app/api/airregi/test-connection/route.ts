/**
 * POST /api/airregi/test-connection
 *
 * Airレジ APIへの接続確認エンドポイント。
 * サーバー側でのみ認証情報を扱い、クライアントには結果のみ返す。
 *
 * リクエストボディ（JSON）:
 *   { apiKey?: string; apiToken?: string; storeId?: string }
 *   ※ 省略時は保存済みの設定を使用
 *
 * レスポンス:
 *   { ok: boolean; message: string; checkedAt: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getAirregiConfig, saveAirregiConfig } from "@/lib/airregiConfigStore";
import { testAirregiConnection }               from "@/lib/airregi/client";
import { revalidatePath }                      from "next/cache";
import type { AirregiConnectionStatus }        from "@/types/airregi";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    apiKey?:   string;
    apiToken?: string;
    storeId?:  string;
  };

  const config = getAirregiConfig();

  // リクエストに渡された値を優先、なければ保存済み値を使用
  const apiKey   = body.apiKey?.trim()   || config.apiKey;
  const apiToken = body.apiToken?.trim() || config.apiToken;
  const storeId  = body.storeId?.trim()  || config.storeId || undefined;

  if (!apiKey || !apiToken) {
    return NextResponse.json(
      { ok: false, message: "APIキーとアクセストークンが設定されていません", checkedAt: null },
      { status: 400 }
    );
  }

  const checkedAt = new Date().toISOString();
  const result    = await testAirregiConnection({ apiKey, apiToken, storeId });

  const newStatus: AirregiConnectionStatus = result.ok ? "接続成功" : "接続失敗";

  // 結果をサーバー側に永続化
  saveAirregiConfig({
    ...config,
    connectionStatus: newStatus,
    lastCheckedAt:    checkedAt,
    lastErrorMessage: result.ok ? undefined : result.message,
  });

  revalidatePath("/airregi");

  return NextResponse.json({
    ok:        result.ok,
    message:   result.message,
    checkedAt,
    status:    newStatus,
  });
}
