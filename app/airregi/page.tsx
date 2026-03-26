import Link from "next/link";
import { getAllGoods } from "@/lib/store";
import {
  getAllAirregiProducts,
  getAllAirregiStocks,
  getAllAirregiSales,
} from "@/lib/airregiStore";
import { getAirregiConfig } from "@/lib/airregiConfigStore";
import {
  importProductsCsvAction,
  importStocksCsvAction,
  importSalesCsvAction,
  importCatalogCsvAction,
} from "./actions";
import ImportSectionClient from "./ImportSectionClient";
import SettingsSection from "./SettingsSection";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function latestImportedAt(records: { importedAt: string }[]): string | null {
  if (records.length === 0) return null;
  return [...records].sort((a, b) => b.importedAt.localeCompare(a.importedAt))[0].importedAt;
}

export default function AirregiPage() {
  const allGoods   = getAllGoods();
  const products   = getAllAirregiProducts();
  const stocks     = getAllAirregiStocks();
  const sales      = getAllAirregiSales();
  const config     = getAirregiConfig();

  // 連携状態サマリー
  const linkedCount   = allGoods.filter((g) => g.airregiProductCode).length;
  const unlinkedCount = allGoods.length - linkedCount;
  const stockCodeSet  = new Set(stocks.map((s) => s.productCode));
  const matchedCount  = allGoods.filter(
    (g) => g.airregiProductCode && stockCodeSet.has(g.airregiProductCode)
  ).length;

  // Airレジ側のみ（自作ツール未登録）
  const goodsCodeSet  = new Set(allGoods.map((g) => g.airregiProductCode).filter(Boolean));
  const airOnlyCount  = new Set([
    ...products.map((p) => p.productCode),
    ...stocks.map((s) => s.productCode),
  ].filter((c) => !goodsCodeSet.has(c))).size;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Airレジ連携</h1>
        <p className="mt-1 text-sm text-gray-500">
          Airレジを在庫・販売実績の正として、商品コードで自作ツールの商品と突合します。
        </p>
      </div>

      {/* ─── 保留バナー ──────────────────────────────────────────────────── */}
      <div className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
        <p className="font-semibold text-amber-800">⏸ Airレジ連携は現在保留中です</p>
        <ul className="mt-1 space-y-0.5 text-xs text-amber-700">
          <li>・API仕様の確認が不足しているため、API接続確認は停止しています</li>
          <li>・商品コードが空のCSVでは突合が不安定なため、CSV同期も参考値として扱ってください</li>
          <li>・現在は商品一覧・商品登録・商品詳細・会議機能の整備を優先しています</li>
        </ul>
      </div>

      {/* 連携サマリー */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "自作ツールの商品数",     value: allGoods.length,  color: "text-gray-900" },
          { label: "商品コード設定済み",      value: linkedCount,      color: "text-blue-600" },
          { label: "コード未設定",            value: unlinkedCount,    color: unlinkedCount > 0 ? "text-orange-600" : "text-gray-400" },
          { label: "在庫データと一致",        value: matchedCount,     color: matchedCount  > 0 ? "text-green-600" : "text-gray-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* コード未設定商品への導線 */}
      {unlinkedCount > 0 && (
        <div className="rounded border border-orange-200 bg-orange-50 px-4 py-3 text-sm">
          <span className="font-medium text-orange-700">
            {unlinkedCount}件の商品にAirレジ商品コードが設定されていません。
          </span>
          <Link href="/" className="ml-2 text-orange-600 underline hover:opacity-75">
            商品一覧で確認 →
          </Link>
        </div>
      )}

      {/* Airレジのみ商品（自作ツール未登録） */}
      {airOnlyCount > 0 && (
        <div className="rounded border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Airレジに存在するが自作ツールに未登録の商品コードが <strong>{airOnlyCount}件</strong> あります。
          <span className="ml-1 text-yellow-600">必要な商品は自作ツールに追加して商品コードを設定してください。</span>
        </div>
      )}

      {/* ─── API接続設定 ─────────────────────────────────────── */}
      <SettingsSection
        hasApiKey={Boolean(config.apiKey)}
        hasApiToken={Boolean(config.apiToken)}
        storeId={config.storeId ?? ""}
        isEnabled={config.isEnabled}
        connectionStatus={config.connectionStatus}
        lastCheckedAt={config.lastCheckedAt ?? null}
        lastErrorMessage={config.lastErrorMessage ?? null}
      />

      {/* ─── CSV取込 ─────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-600">CSV取込</h2>
        <div className="space-y-4">

          {/* 商品一括編集CSV（メイン） */}
          <section className="rounded border border-blue-200 bg-white p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">
                  商品一括編集CSV取込
                  <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">推奨</span>
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Airレジの「商品一括編集CSV」（CP932・バリエーション複数行）を取り込みます。
                  商品ID単位で集約して保存します。
                  {products.length > 0 && (
                    <span className="ml-2">現在: {products.length}件取込済み（最終: {fmtDate(latestImportedAt(products)!)}）</span>
                  )}
                </p>
              </div>
              {products.length > 0 && (
                <span className="shrink-0 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {products.length}件
                </span>
              )}
            </div>
            <ImportSectionClient
              action={importCatalogCsvAction}
              label="商品一括編集CSV取込"
              acceptedColumns="商品ID, 商品名（必須）, 価格, 商品コード, カテゴリーID, バリエーション（種別1/2）, バーコード, 表示/非表示"
            />
          </section>

          {/* 商品CSV */}
          <section className="rounded border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">商品CSV取込</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Airレジの商品マスタCSVを取り込みます。
                  {products.length > 0 && (
                    <span className="ml-2">
                      現在: {products.length}件（最終取込: {fmtDate(latestImportedAt(products)!)}）
                    </span>
                  )}
                </p>
              </div>
              {products.length > 0 && (
                <span className="shrink-0 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {products.length}件取込済み
                </span>
              )}
            </div>
            <ImportSectionClient
              action={importProductsCsvAction}
              label="商品CSV取込"
              acceptedColumns="商品コード, 商品名（必須）, カテゴリ, バーコード, 販売価格"
            />
          </section>

          {/* 在庫CSV */}
          <section className="rounded border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">在庫CSV取込</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Airレジの在庫CSVを取り込みます。取込後は商品詳細で在庫数を確認できます。
                  {stocks.length > 0 && (
                    <span className="ml-2">
                      現在: {stocks.length}件（最終取込: {fmtDate(latestImportedAt(stocks)!)}）
                    </span>
                  )}
                </p>
              </div>
              {stocks.length > 0 && (
                <span className="shrink-0 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  {stocks.length}件取込済み
                </span>
              )}
            </div>
            <ImportSectionClient
              action={importStocksCsvAction}
              label="在庫CSV取込"
              acceptedColumns="商品コード（必須）, 商品名, 在庫数（必須）, カテゴリ"
            />
          </section>

          {/* 売上CSV */}
          <section className="rounded border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">売上CSV取込</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Airレジの売上CSVを取り込みます。取込後は商品詳細で販売数・売上を確認できます。
                  {sales.length > 0 && (
                    <span className="ml-2">
                      現在: {sales.length}件（最終取込: {fmtDate(latestImportedAt(sales)!)}）
                    </span>
                  )}
                </p>
              </div>
              {sales.length > 0 && (
                <span className="shrink-0 rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  {sales.length}件取込済み
                </span>
              )}
            </div>
            <ImportSectionClient
              action={importSalesCsvAction}
              label="売上CSV取込"
              acceptedColumns="商品コード（必須）, 商品名, 販売数, 売上金額, 期間開始, 期間終了"
            />
          </section>

        </div>
      </div>

      {/* 利用上の注意 */}
      <section className="rounded border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-600">ご利用上の注意</p>
        <p>・API同期・CSV取込ともに、取込のたびに全データが上書きされます（差分更新ではありません）</p>
        <p>・CSVはUTF-8・Shift-JISどちらも対応しています（Airレジ標準のShift-JIS出力をそのまま使用できます）</p>
        <p>・商品コードを共通キーとして紐付けます。自作ツール側の商品コードは各商品の編集画面から設定できます</p>
        <p>・Airレジ側への書き戻しは行いません（片方向取込のみ）</p>
        <p>・APIキー・トークンはサーバー側（/data/airregi-config.json）に保存されます。ブラウザには送信されません</p>
      </section>
    </div>
  );
}
