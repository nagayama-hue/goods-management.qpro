/**
 * Airレジ データ連携API クライアント（サーバー専用）
 *
 * ■ ベースURLの設定方法
 *   .env.local に以下を追加してください:
 *   AIRREGI_API_BASE=https://（Airレジバックオフィスで確認したAPIのURL）
 *
 *   確認場所: AirレジバックオフィスURL → 設定 → 他システム連携 → データ連携API
 *   → 「APIドキュメント」または「仕様書」リンクからベースURLを確認
 *
 * ■ 認証方式（要確認）
 *   現在の実装: クエリパラメータ ?api_key=XXX&access_token=YYY
 *   仕様書に合わせてヘッダー認証に変更が必要な場合は callApi を修正してください
 */

// ─── ベースURL ─────────────────────────────────────────────────────────────
// 未設定・空文字の場合は undefined として扱い、起動エラーにはしない。
// 接続確認時に「未設定」エラーを返す。
// Vercel: Environment Variables に AIRREGI_API_BASE を設定してください。
const AIRREGI_API_BASE: string | undefined =
  process.env.AIRREGI_API_BASE?.trim() || undefined;

// ─── 型定義 ────────────────────────────────────────────────────────────────

export interface AirregiClientConfig {
  apiKey:   string;
  apiToken: string;
  storeId?: string;
}

export class AirregiApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = "AirregiApiError";
  }
}

// Airレジ API レスポンス型（実際のレスポンスに合わせて調整）
export interface AirregiRawProduct {
  item_code?:     string;
  itemCode?:      string;
  product_code?:  string;
  productCode?:   string;
  code?:          string;
  item_name?:     string;
  itemName?:      string;
  product_name?:  string;
  productName?:   string;
  name?:          string;
  category?:      string;
  category_name?: string;
  barcode?:       string;
  price?:         number;
  unit_price?:    number;
  unitPrice?:     number;
  selling_price?: number;
  sellingPrice?:  number;
}

export interface AirregiRawStock {
  item_code?:      string;
  itemCode?:       string;
  product_code?:   string;
  productCode?:    string;
  code?:           string;
  item_name?:      string;
  itemName?:       string;
  name?:           string;
  quantity?:       number;
  stock?:          number;
  stock_quantity?: number;
  inventory?:      number;
}

export interface AirregiRawSale {
  item_code?:      string;
  itemCode?:       string;
  product_code?:   string;
  productCode?:    string;
  code?:           string;
  item_name?:      string;
  itemName?:       string;
  name?:           string;
  quantity?:       number;
  sales_quantity?: number;
  salesQuantity?:  number;
  count?:          number;
  amount?:         number;
  sales_amount?:   number;
  salesAmount?:    number;
  total_amount?:   number;
  totalAmount?:    number;
}

// ─── 内部: fetchラッパー（診断ログ付き） ─────────────────────────────────

async function callApi<T>(
  config: AirregiClientConfig,
  path: string,
  params: Record<string, string> = {}
): Promise<T> {
  // ── ベースURL未設定チェック（起動は通過、呼び出し時にエラー） ──────────
  if (!AIRREGI_API_BASE) {
    throw new AirregiApiError(
      "AIRREGI_API_BASE が未設定です。" +
      "Airレジバックオフィスの「設定 → 他システム連携 → データ連携API → 仕様書」で" +
      "ベースURLを確認し、.env.local（またはVercel環境変数）に設定してください。"
    );
  }

  // ── URL構築（malformedな場合も startup ではなく呼び出し時にエラー） ──
  let url: URL;
  try {
    url = new URL(`${AIRREGI_API_BASE}${path}`);
  } catch {
    throw new AirregiApiError(
      `AIRREGI_API_BASE の値が不正なURLです: "${AIRREGI_API_BASE}"` +
      " — Airレジ仕様書で正しいベースURLを確認してください。"
    );
  }
  url.searchParams.set("api_key",      config.apiKey);
  url.searchParams.set("access_token", config.apiToken);
  if (config.storeId) url.searchParams.set("store_id", config.storeId);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  // ログ用: 認証情報をマスク
  const logUrl = new URL(url.toString());
  logUrl.searchParams.set("api_key",      "****");
  logUrl.searchParams.set("access_token", "****");

  // ── fetch ────────────────────────────────────────────────────────────
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method:  "GET",
      headers: { Accept: "application/json" },
      cache:   "no-store",
      signal:  AbortSignal.timeout(20_000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Airレジ API] ネットワークエラー", { url: logUrl.toString(), error: msg });
    throw new AirregiApiError(`ネットワークエラー: ${msg}`);
  }

  const contentType = res.headers.get("content-type") ?? "(なし)";
  const body        = await res.text().catch(() => "");
  const bodyHead    = body.slice(0, 100);

  // ── サーバーログ（診断用・常に出力） ─────────────────────────────────
  console.log("[Airレジ API] レスポンス診断", {
    url:         logUrl.toString(),
    status:      res.status,
    contentType,
    bodyHead,
  });

  // ── HTML返却 → URL誤りの可能性が高い ─────────────────────────────────
  if (contentType.includes("text/html")) {
    console.error("[Airレジ API] ⚠ HTMLが返されました。APIベースURLが誤っている可能性が高いです。", {
      url: logUrl.toString(), status: res.status, contentType, bodyHead,
    });
    throw new AirregiApiError(
      `APIベースURLが誤っている可能性が高いです（HTMLが返されました）。` +
      ` AIRREGI_API_BASE="${AIRREGI_API_BASE}" を確認してください。` +
      ` — HTTP ${res.status} / ${contentType} — ${bodyHead}`,
      res.status,
      body
    );
  }

  // ── HTTPエラー ────────────────────────────────────────────────────────
  if (!res.ok) {
    console.error("[Airレジ API] HTTPエラー", {
      url: logUrl.toString(), status: res.status, contentType, bodyHead,
    });
    throw new AirregiApiError(
      `APIエラー: HTTP ${res.status} — ${bodyHead}`,
      res.status,
      body
    );
  }

  // ── JSON解析 ──────────────────────────────────────────────────────────
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new AirregiApiError(
      `レスポンスのJSON解析失敗 (Content-Type: ${contentType}) — ${bodyHead}`
    );
  }
}

// ─── 接続確認 ─────────────────────────────────────────────────────────────

export async function testAirregiConnection(
  config: AirregiClientConfig
): Promise<{ ok: boolean; message: string }> {
  // 未設定を即返却（外部通信しない）
  if (!AIRREGI_API_BASE) {
    return {
      ok:      false,
      message:
        "AIRREGI_API_BASE が未設定です。" +
        "Airレジバックオフィスの「設定 → 他システム連携 → データ連携API → 仕様書」で" +
        "ベースURLを確認し、.env.local（またはVercel環境変数）に AIRREGI_API_BASE として設定してください。",
    };
  }

  // 疎通確認（エンドポイントパスはAirレジ仕様書で確認してください）
  try {
    await callApi(config, "/items/", { limit: "1" });
    return { ok: true, message: "接続成功" };
  } catch (e) {
    const msg =
      e instanceof AirregiApiError ? e.message :
      e instanceof Error           ? e.message : "接続失敗（不明なエラー）";
    return { ok: false, message: msg };
  }
}

// ─── 商品マスタ取得 ───────────────────────────────────────────────────────

export async function fetchAirregiProducts(
  config: AirregiClientConfig
): Promise<AirregiRawProduct[]> {
  type Res = { items?: AirregiRawProduct[] } | AirregiRawProduct[];
  const data = await callApi<Res>(config, "/items/");
  return Array.isArray(data) ? data : (data.items ?? []);
}

// ─── 在庫取得 ─────────────────────────────────────────────────────────────

export async function fetchAirregiStocks(
  config: AirregiClientConfig
): Promise<AirregiRawStock[]> {
  type Res = { items?: AirregiRawStock[] } | AirregiRawStock[];
  const data = await callApi<Res>(config, "/inventory/items/");
  return Array.isArray(data) ? data : (data.items ?? []);
}

// ─── 売上集計取得 ─────────────────────────────────────────────────────────

export async function fetchAirregiSales(
  config: AirregiClientConfig,
  opts: { startDate?: string; endDate?: string } = {}
): Promise<AirregiRawSale[]> {
  const params: Record<string, string> = {};
  if (opts.startDate) params["start_date"] = opts.startDate;
  if (opts.endDate)   params["end_date"]   = opts.endDate;
  type Res = { items?: AirregiRawSale[] } | AirregiRawSale[];
  const data = await callApi<Res>(config, "/sales/aggregations/items/", params);
  return Array.isArray(data) ? data : (data.items ?? []);
}

// ─── Raw → 内部型 変換ヘルパー ────────────────────────────────────────────

type AnyRaw = AirregiRawProduct | AirregiRawStock | AirregiRawSale;

export function extractCode(item: AnyRaw): string | undefined {
  return item.item_code ?? (item as AirregiRawProduct).product_code
    ?? (item as AirregiRawProduct).productCode ?? item.itemCode ?? item.code
    ?? undefined;
}

export function extractName(item: AnyRaw): string | undefined {
  return item.item_name ?? (item as AirregiRawProduct).product_name
    ?? (item as AirregiRawProduct).productName ?? item.itemName ?? item.name
    ?? undefined;
}

export function extractStock(item: AirregiRawStock): number {
  const v = item.stock_quantity ?? item.quantity ?? item.stock ?? item.inventory ?? 0;
  return typeof v === "number" ? v : (Number(v) || 0);
}

export function extractSalesQty(item: AirregiRawSale): number {
  const v = item.sales_quantity ?? item.salesQuantity ?? item.quantity ?? item.count ?? 0;
  return typeof v === "number" ? v : (Number(v) || 0);
}

export function extractSalesAmount(item: AirregiRawSale): number {
  const v = item.sales_amount ?? item.salesAmount ?? item.total_amount ?? item.totalAmount ?? item.amount ?? 0;
  return typeof v === "number" ? v : (Number(v) || 0);
}

export function extractUnitPrice(item: AirregiRawProduct): number | undefined {
  const v = item.unit_price ?? item.unitPrice ?? item.price ?? item.selling_price ?? item.sellingPrice;
  if (v === undefined || v === null) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return isNaN(n) ? undefined : n;
}
