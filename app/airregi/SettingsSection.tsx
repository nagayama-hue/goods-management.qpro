"use client";

import { useActionState, useRef } from "react";
import { configAction } from "./settingsActions";
import type { ConfigActionResult } from "./settingsActions";
import type { AirregiConnectionStatus } from "@/types/airregi";

interface Props {
  hasApiKey:          boolean;
  hasApiToken:        boolean;
  storeId:            string;
  isEnabled:          boolean;
  connectionStatus:   AirregiConnectionStatus;
  lastCheckedAt?:     string | null;
  lastErrorMessage?:  string | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_STYLE: Record<AirregiConnectionStatus, string> = {
  "未設定":   "bg-gray-100  text-gray-500",
  "確認前":   "bg-yellow-100 text-yellow-700",
  "接続成功": "bg-green-100  text-green-700",
  "接続失敗": "bg-red-100    text-red-700",
};
const STATUS_ICON: Record<AirregiConnectionStatus, string> = {
  "未設定":   "—",
  "確認前":   "?",
  "接続成功": "✓",
  "接続失敗": "✗",
};

export default function SettingsSection({
  hasApiKey,
  hasApiToken,
  storeId,
  isEnabled,
  connectionStatus,
  lastCheckedAt,
  lastErrorMessage,
}: Props) {
  const [result, formAction, isPending] = useActionState<ConfigActionResult | null, FormData>(
    configAction,
    null
  );
  const actionRef = useRef<"save" | "test">("save");

  // アクション後に最新の接続状態を使う（Server Action が revalidate するまでの間）
  const displayStatus: AirregiConnectionStatus =
    result?.action === "test"
      ? result.ok ? "接続成功" : "接続失敗"
      : connectionStatus;

  return (
    <section className="rounded border border-gray-200 bg-white p-5">
      {/* ヘッダー + 接続状態バッジ */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">API接続設定</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            AirレジバックオフィスURL「設定 → 他システム連携 → データ連携API」でAPIキー・アクセストークンを発行してください。
          </p>
        </div>
        <span className={`shrink-0 rounded px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[displayStatus]}`}>
          {STATUS_ICON[displayStatus]} {displayStatus}
        </span>
      </div>

      {/* 最終確認日時・エラーメッセージ */}
      {(lastCheckedAt || lastErrorMessage) && (
        <div className="mb-4 rounded border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
          {lastCheckedAt && (
            <p className="text-gray-500">最終確認: {fmtDate(lastCheckedAt)}</p>
          )}
          {lastErrorMessage && connectionStatus === "接続失敗" && (
            <p className="mt-0.5 text-red-600">エラー: {lastErrorMessage}</p>
          )}
        </div>
      )}

      <form
        action={(fd) => {
          fd.set("_action", actionRef.current);
          return formAction(fd);
        }}
        className="space-y-4"
      >
        {/* 有効/無効 */}
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              name="isEnabled"
              value="true"
              defaultChecked={isEnabled}
              className="h-4 w-4 rounded border-gray-300 accent-gray-900"
            />
            <span className="text-sm font-medium text-gray-700">API連携を有効にする</span>
          </label>
          {isEnabled && (
            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">有効</span>
          )}
        </div>

        {/* APIキー / アクセストークン */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              APIキー
              {hasApiKey && <span className="ml-2 text-green-600">設定済み ✓</span>}
            </label>
            <input
              type="password"
              name="apiKey"
              autoComplete="off"
              placeholder={hasApiKey ? "（変更する場合のみ入力）" : "APIキーを入力"}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              アクセストークン
              {hasApiToken && <span className="ml-2 text-green-600">設定済み ✓</span>}
            </label>
            <input
              type="password"
              name="apiToken"
              autoComplete="off"
              placeholder={hasApiToken ? "（変更する場合のみ入力）" : "アクセストークンを入力"}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
        </div>

        {/* 店舗識別子 */}
        <div className="max-w-xs">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            店舗識別子
            <span className="ml-1 text-gray-400">（任意・複数店舗の場合）</span>
          </label>
          <input
            type="text"
            name="storeId"
            defaultValue={storeId}
            placeholder="例: 00001"
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>

        {/* ボタン */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            onClick={() => { actionRef.current = "save"; }}
            disabled={isPending}
            className="rounded bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {isPending ? "保存中..." : "設定を保存"}
          </button>
          {/* 接続確認: Airレジ API仕様確認中のため停止 */}
          <button
            type="button"
            disabled
            title="Airレジ側の連携仕様確認後に有効化します"
            className="rounded border border-gray-200 bg-gray-50 px-4 py-1.5 text-sm font-medium text-gray-400 cursor-not-allowed"
          >
            接続を確認（停止中）
          </button>
        </div>

        {/* 仕様確認待ち告知 */}
        <div className="rounded border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-800">
          <p className="font-medium">⏸ Airレジ側の連携仕様確認待ち</p>
          <p className="mt-1">
            APIベースURL・エンドポイント仕様が確認できるまで、接続確認は停止しています。
            設定値（APIキー・トークン）の保存は引き続き可能です。
          </p>
        </div>
      </form>

      {/* アクション後のインライン結果 */}
      {result && (
        <div className={`mt-4 rounded border px-4 py-3 text-sm ${
          result.ok
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          <p className="font-medium">
            {result.ok ? "✓ " : "✗ "}
            {result.action === "test" ? "接続確認" : "設定保存"}
            {result.ok ? "成功" : "失敗"}
          </p>
          {/* エラー詳細を全文表示（折り返し・コピー可） */}
          <p className="mt-1 break-all font-mono text-xs leading-relaxed">
            {result.message}
          </p>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400">
        ※ APIキー・トークンはサーバー側（data/airregi-config.json）にのみ保存されます。ブラウザには送信されません。
      </p>
    </section>
  );
}
