"use client";

import { useActionState } from "react";
import type { AirregiImportResult } from "@/types/airregi";

type ActionFn = (
  prev: AirregiImportResult | null,
  formData: FormData
) => Promise<AirregiImportResult>;

interface Props {
  action:          ActionFn;
  label:           string;  // "在庫CSV取込" など
  acceptedColumns: string;  // 対応列の説明
}

function ResultDisplay({ result }: { result: AirregiImportResult }) {
  const hasError  = result.errors > 0;
  // 商品一括編集CSV（集約モード）かどうか
  const isCatalog = result.rowCount !== undefined;

  return (
    <div className={`mt-4 rounded border p-4 text-sm ${
      hasError ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50"
    }`}>
      <p className={`mb-2 font-medium ${hasError ? "text-yellow-800" : "text-green-700"}`}>
        {hasError ? "⚠ 取込完了（一部エラーあり）" : "✓ 取込完了"}
      </p>
      <ul className="space-y-0.5 text-xs">
        {isCatalog ? (
          <>
            <li className="text-gray-600">読込行数（バリエーション含む）：{result.rowCount}行</li>
            <li className="text-gray-600">集約後の商品数：{result.total}件</li>
            <li className="text-green-700">更新（商品コード一致）：{result.updatedByCode ?? 0}件</li>
            <li className="text-green-600">更新（商品ID一致）：{result.updatedByExtId ?? 0}件</li>
            <li className="text-blue-600">新規追加：{result.unlinked}件</li>
            {result.skipped > 0 && (
              <li className="text-gray-400">スキップ（商品ID・商品名ともに空）：{result.skipped}行</li>
            )}
            {(result.noCodeCount ?? 0) > 0 && (
              <li className="text-orange-600">商品コード未設定：{result.noCodeCount}件</li>
            )}
          </>
        ) : (
          <>
            <li className="text-gray-600">取込件数：{result.total}件</li>
            <li className="text-green-700">更新（既存コード一致）：{result.linked}件</li>
            <li className="text-blue-600">新規候補：{result.unlinked}件</li>
            {result.skipped > 0 && (
              <li className="text-gray-400">スキップ：{result.skipped}件</li>
            )}
          </>
        )}
        {result.errors > 0 && (
          <li className="text-red-600">エラー：{result.errors}件</li>
        )}
      </ul>
      {result.errorDetails.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-red-600 hover:underline">
            エラー詳細を表示
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

export default function ImportSectionClient({ action, label, acceptedColumns }: Props) {
  const [result, formAction, isPending] = useActionState(action, null);

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">
        対応列：{acceptedColumns}
      </p>
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="csv"
          accept=".csv"
          required
          className="block text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:text-gray-700 file:hover:bg-gray-200"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? "取込中..." : label}
        </button>
      </form>
      {result && <ResultDisplay result={result} />}
    </div>
  );
}
