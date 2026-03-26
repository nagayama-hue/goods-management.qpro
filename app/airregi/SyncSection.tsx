"use client";

import { useActionState } from "react";
import { syncAction } from "./syncAction";
import type { AirregiSyncResult } from "@/types/airregi";

interface Props {
  isEnabled:       boolean;
  lastSyncAt?:     string | null;
  lastSyncStatus?: "success" | "partial" | "error" | null;
  lastSyncMessage?: string | null;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: "success" | "partial" | "error" }) {
  const map = {
    success: "bg-green-100 text-green-700",
    partial: "bg-yellow-100 text-yellow-700",
    error:   "bg-red-100   text-red-700",
  } as const;
  const label = { success: "成功", partial: "一部エラー", error: "失敗" } as const;
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function SyncResultDisplay({ result }: { result: AirregiSyncResult }) {
  const isOk = result.status !== "error";
  return (
    <div className={`mt-4 rounded border p-4 text-sm ${
      isOk ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
    }`}>
      <p className={`mb-2 font-medium ${isOk ? "text-green-700" : "text-red-700"}`}>
        {isOk ? "✓" : "✗"} {result.message}
      </p>
      {(result.productsTotal > 0 || result.stocksTotal > 0 || result.salesTotal > 0) && (
        <ul className="space-y-0.5 text-xs text-gray-600">
          <li>商品: {result.productsTotal}件 / 在庫: {result.stocksTotal}件 / 売上: {result.salesTotal}件</li>
          <li className="text-green-700">自作ツールと突合: {result.matchedGoods}件</li>
          {result.unmatchedAir > 0 && (
            <li className="text-orange-600">Airレジのみ（自作ツール未登録）: {result.unmatchedAir}件</li>
          )}
        </ul>
      )}
      {result.errorDetails.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-red-600 hover:underline">
            エラー詳細 ({result.errors}件)
          </summary>
          <ul className="mt-1 space-y-0.5 text-xs text-red-700">
            {result.errorDetails.map((d, i) => (
              <li key={i}>・{d}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function SyncSection({ isEnabled, lastSyncAt, lastSyncStatus, lastSyncMessage }: Props) {
  const [result, formAction, isPending] = useActionState<AirregiSyncResult | null, FormData>(
    syncAction,
    null
  );

  return (
    <section className="rounded border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">手動同期</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            AirレジAPIから商品・在庫・売上を一括取得します。
          </p>
        </div>
        {!isEnabled && (
          <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            API連携 無効
          </span>
        )}
      </div>

      {/* 最終同期ステータス */}
      {lastSyncAt && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>最終同期: {fmtDate(lastSyncAt)}</span>
          {lastSyncStatus && <StatusBadge status={lastSyncStatus} />}
          {lastSyncMessage && <span className="text-gray-400">{lastSyncMessage}</span>}
        </div>
      )}

      {/* 同期ボタン */}
      <form action={formAction} className="mt-4">
        <button
          type="submit"
          disabled={isPending || !isEnabled}
          className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "同期中..." : "今すぐ同期"}
        </button>
        {!isEnabled && (
          <span className="ml-3 text-xs text-gray-400">
            API連携を有効にすると実行できます
          </span>
        )}
      </form>

      {/* 同期結果 */}
      {result && <SyncResultDisplay result={result} />}
    </section>
  );
}
