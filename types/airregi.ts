/**
 * Airレジ連携用の型定義。
 * CSVから取り込んだデータをローカルに保持するための受け皿。
 */

/** Airレジとの連携状態 */
export type AirregiSyncStatus =
  | "linked"    // 商品コード一致・データあり
  | "unlinked"  // 商品コード未設定
  | "missing";  // 商品コードはあるがAirレジ側に該当なし

/** バリエーション1行分のデータ */
export interface AirregiVariant {
  variationId:   string;
  variationType1?: string;  // バリエーション（種別1）
  variationType2?: string;  // バリエーション（種別2）
  barcode?:      string;
  price?:        number;    // バリエーション個別価格
}

/** Airレジ商品CSVから取り込んだ1レコード（商品ID単位で集約済み） */
export interface AirregiProductRecord {
  id:                 string;
  productCode:        string;   // 商品コード（共通リンクキー）
  productName:        string;
  externalProductId?: string;   // AirレジCSVの「商品ID」列
  category?:          string;
  categoryId?:        string;
  barcode?:           string;
  unitPrice?:         number;
  costPrice?:         number;
  isVisible?:         boolean;  // 表示/非表示
  source?:            string;   // "airregi_csv" など
  variants?:          AirregiVariant[];
  importedAt:         string;   // ISO8601
}

/** Airレジ在庫CSVから取り込んだ1レコード */
export interface AirregiStockRecord {
  id:           string;
  productCode:  string;   // 共通キー
  productName:  string;
  currentStock: number;
  category?:    string;
  importedAt:   string;
}

/** Airレジ売上CSVから取り込んだ1レコード */
export interface AirregiSalesRecord {
  id:                 string;
  productCode:        string;   // 共通キー
  productName:        string;
  salesQuantity:      number;
  salesAmount:        number;
  targetPeriodStart?: string;
  targetPeriodEnd?:   string;
  importedAt:         string;
}

/** CSVインポートの結果サマリー */
export interface AirregiImportResult {
  type:            "products" | "stocks" | "sales";
  importedAt:      string;
  rowCount?:       number;   // CSV から読み込んだ行数（バリエーション行含む）
  total:           number;   // 集約後の商品件数
  linked:          number;   // 更新（コード一致 + 商品ID一致 の合計、旧互換）
  unlinked:        number;   // 新規追加
  skipped:         number;   // スキップ（商品ID・商品名ともに空）
  errors:          number;   // エラー件数
  errorDetails:    string[];
  // ── 商品一括編集CSV 専用の内訳 ─────────────────────────────────────
  updatedByCode?:  number;   // 更新（商品コード一致）
  updatedByExtId?: number;   // 更新（商品ID一致）
  noCodeCount?:    number;   // 商品コード未設定件数
}

// ─── API連携設定 ──────────────────────────────────────────────────────────────

/**
 * Airレジ データ連携API の接続設定。
 * サーバー側 /data/airregi-config.json に保存。クライアントには送信しない。
 */
/** 接続確認の状態（ページをまたいで永続） */
export type AirregiConnectionStatus =
  | "未設定"    // APIキー/トークン未入力
  | "確認前"    // 資格情報はあるが未テスト
  | "接続成功"  // 最後の接続確認が成功
  | "接続失敗"; // 最後の接続確認が失敗

export interface AirregiConfig {
  apiKey:              string;  // データ連携APIキー
  apiToken:            string;  // アクセストークン
  storeId?:            string;  // 店舗識別子（複数店舗の場合）
  isEnabled:           boolean; // API連携を有効にするか
  // ── 接続確認 ──────────────────────────────
  connectionStatus:    AirregiConnectionStatus;
  lastCheckedAt?:      string;  // 接続確認日時 ISO8601
  lastErrorMessage?:   string;  // 接続失敗時のエラー詳細
  // ── 同期履歴 ──────────────────────────────
  lastSyncAt?:         string;  // 最終同期日時 ISO8601
  lastSyncStatus?:     "success" | "partial" | "error";
  lastSyncMessage?:    string;
}

/** API経由での同期結果サマリー */
export interface AirregiSyncResult {
  syncedAt:      string;
  productsTotal: number;  // 取得した商品レコード数
  stocksTotal:   number;  // 取得した在庫レコード数
  salesTotal:    number;  // 取得した売上レコード数
  matchedGoods:  number;  // 自作ツールと突合できた件数
  unmatchedAir:  number;  // Airレジにあるが自作ツール側に未登録の件数
  errors:        number;
  errorDetails:  string[];
  status:        "success" | "partial" | "error";
  message:       string;
}
