"use server";

import { revalidatePath } from "next/cache";
import { parseCsvToObjects, parseCsvToObjectsRaw, findValue } from "@/lib/csvParser";
import {
  getAllAirregiProducts,
  saveAllAirregiProducts,
  saveAllAirregiStocks,
  saveAllAirregiSales,
} from "@/lib/airregiStore";
import { getAllGoods } from "@/lib/store";
import type {
  AirregiProductRecord,
  AirregiStockRecord,
  AirregiSalesRecord,
  AirregiImportResult,
  AirregiVariant,
} from "@/types/airregi";

// ─── 共通: CSVファイルを読み込む ─────────────────────────────────────────
// Airレジ出力CSVは Shift-JIS。UTF-8 BOM があれば UTF-8 として扱う。

async function readCsvFile(formData: FormData): Promise<string | null> {
  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) return null;

  const buffer = await file.arrayBuffer();
  const bytes  = new Uint8Array(buffer.slice(0, 3));

  // UTF-8 BOM (EF BB BF) があれば UTF-8
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder("utf-8").decode(buffer);
  }

  // Airレジ は Shift-JIS
  try {
    return new TextDecoder("shift-jis").decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

// ─── 共通: 自作ツールの商品コードセットを取得 ────────────────────────────

function getGoodsCodeSet(): Set<string> {
  return new Set(
    getAllGoods()
      .map((g) => g.airregiProductCode)
      .filter((c): c is string => Boolean(c))
  );
}

// ─── 商品CSVインポート ────────────────────────────────────────────────────

export async function importProductsCsvAction(
  _prev: AirregiImportResult | null,
  formData: FormData
): Promise<AirregiImportResult> {
  const importedAt = new Date().toISOString();

  const csvText = await readCsvFile(formData);
  if (!csvText) {
    return { type: "products", importedAt, total: 0, linked: 0, unlinked: 0, skipped: 0, errors: 1, errorDetails: ["ファイルが選択されていません"] };
  }

  const rows = parseCsvToObjects(csvText);
  if (rows.length === 0) {
    return { type: "products", importedAt, total: 0, linked: 0, unlinked: 0, skipped: 0, errors: 1,
      errorDetails: ["データ行が見つかりませんでした。CSVのフォーマットを確認してください。"] };
  }

  const goodsCodes  = getGoodsCodeSet();
  const records: AirregiProductRecord[] = [];
  const errorDetails: string[] = [];
  let linked = 0, unlinked = 0, skipped = 0;

  rows.forEach((row, i) => {
    const lineNo    = i + 2;
    const code             = findValue(row, "productCode");
    const externalProductId = findValue(row, "airregiId");  // alias "商品ID"

    // 商品コードが空 → スキップ（エラーではない）
    if (!code) {
      skipped++;
      return;
    }

    const name = findValue(row, "productName");
    if (!name) {
      errorDetails.push(`行 ${lineNo}: 商品名が空です`);
      return;
    }

    const priceRaw    = findValue(row, "unitPrice");
    const price       = priceRaw ? parseFloat(priceRaw.replace(/[,¥円]/g, "")) : undefined;
    const costRaw     = findValue(row, "costPrice");
    const cost        = costRaw  ? parseFloat(costRaw.replace(/[,¥円]/g, ""))  : undefined;
    const visibleRaw  = findValue(row, "isVisible");
    const isVisible   = visibleRaw !== undefined ? visibleRaw !== "非表示" : undefined;

    records.push({
      id:                `ar-p-${Date.now()}-${i}`,
      productCode:       code,
      productName:       name,
      externalProductId,
      category:          findValue(row, "category"),
      categoryId:        findValue(row, "categoryId"),
      barcode:           findValue(row, "barcode"),
      unitPrice:         price && !isNaN(price) ? price : undefined,
      costPrice:         cost  && !isNaN(cost)  ? cost  : undefined,
      isVisible,
      importedAt,
    });

    if (goodsCodes.has(code)) { linked++; } else { unlinked++; }
  });

  saveAllAirregiProducts(records);
  revalidatePath("/");
  revalidatePath("/airregi");

  return {
    type: "products",
    importedAt,
    total:   records.length,
    linked,
    unlinked,
    skipped,
    errors:  errorDetails.length,
    errorDetails,
  };
}

// ─── 在庫CSVインポート ────────────────────────────────────────────────────

export async function importStocksCsvAction(
  _prev: AirregiImportResult | null,
  formData: FormData
): Promise<AirregiImportResult> {
  const importedAt = new Date().toISOString();

  const csvText = await readCsvFile(formData);
  if (!csvText) {
    return { type: "stocks", importedAt, total: 0, linked: 0, unlinked: 0, skipped: 0, errors: 1, errorDetails: ["ファイルが選択されていません"] };
  }

  const rows       = parseCsvToObjects(csvText);
  const goodsCodes = getGoodsCodeSet();
  const records: AirregiStockRecord[] = [];
  const errorDetails: string[] = [];
  let linked = 0, unlinked = 0;

  rows.forEach((row, i) => {
    const lineNo      = i + 2;
    const code        = findValue(row, "productCode");
    const name        = findValue(row, "productName");
    const stockRaw    = findValue(row, "currentStock");

    if (!code) {
      errorDetails.push(`行 ${lineNo}: 商品コードが空です`);
      return;
    }

    const stock = stockRaw !== undefined ? parseInt(stockRaw.replace(/,/g, ""), 10) : 0;
    if (stockRaw !== undefined && isNaN(stock)) {
      errorDetails.push(`行 ${lineNo}: 在庫数が数値ではありません（"${stockRaw}"）`);
      return;
    }

    records.push({
      id:           `ar-s-${Date.now()}-${i}`,
      productCode:  code,
      productName:  name ?? code,
      currentStock: stock,
      category:     findValue(row, "category"),
      importedAt,
    });

    if (goodsCodes.has(code)) { linked++; } else { unlinked++; }
  });

  saveAllAirregiStocks(records);
  revalidatePath("/");
  revalidatePath("/airregi");

  return {
    type: "stocks",
    importedAt,
    total:   records.length,
    linked,
    unlinked,
    skipped: 0,
    errors:  errorDetails.length,
    errorDetails,
  };
}

// ─── 売上CSVインポート ────────────────────────────────────────────────────

export async function importSalesCsvAction(
  _prev: AirregiImportResult | null,
  formData: FormData
): Promise<AirregiImportResult> {
  const importedAt = new Date().toISOString();

  const csvText = await readCsvFile(formData);
  if (!csvText) {
    return { type: "sales", importedAt, total: 0, linked: 0, unlinked: 0, skipped: 0, errors: 1, errorDetails: ["ファイルが選択されていません"] };
  }

  const rows       = parseCsvToObjects(csvText);
  const goodsCodes = getGoodsCodeSet();
  const records: AirregiSalesRecord[] = [];
  const errorDetails: string[] = [];
  let linked = 0, unlinked = 0;

  rows.forEach((row, i) => {
    const lineNo   = i + 2;
    const code     = findValue(row, "productCode");
    const name     = findValue(row, "productName");
    const qtyRaw   = findValue(row, "salesQuantity");
    const amtRaw   = findValue(row, "salesAmount");

    if (!code) {
      errorDetails.push(`行 ${lineNo}: 商品コードが空です`);
      return;
    }

    const qty = qtyRaw ? parseInt(qtyRaw.replace(/,/g, ""), 10) : 0;
    const amt = amtRaw ? parseFloat(amtRaw.replace(/[,¥円]/g, "")) : 0;

    if (qtyRaw && isNaN(qty)) {
      errorDetails.push(`行 ${lineNo}: 販売数が数値ではありません`);
      return;
    }

    records.push({
      id:                 `ar-sa-${Date.now()}-${i}`,
      productCode:        code,
      productName:        name ?? code,
      salesQuantity:      isNaN(qty) ? 0 : qty,
      salesAmount:        isNaN(amt) ? 0 : amt,
      targetPeriodStart:  findValue(row, "periodStart"),
      targetPeriodEnd:    findValue(row, "periodEnd"),
      importedAt,
    });

    if (goodsCodes.has(code)) { linked++; } else { unlinked++; }
  });

  saveAllAirregiSales(records);
  revalidatePath("/");
  revalidatePath("/airregi");

  return {
    type: "sales",
    importedAt,
    total:   records.length,
    linked,
    unlinked,
    skipped: 0,
    errors:  errorDetails.length,
    errorDetails,
  };
}

// ─── 商品一括編集CSVインポート（バリエーション集約版） ─────────────────────
//
// Airレジの「商品一括編集CSV」専用。
// 1行=1バリエーション のため、同じ商品IDを持つ行を集約して1商品レコードを作成する。
// 既存の Airレジ商品レコードと照合して 更新/新規追加 を判定する。
//
// 列名対応（parseCsvToObjectsRaw を使用し括弧を保持）:
//   "商品ID"                    → externalProductId
//   "バリエーションID"          → variant.variationId
//   "カテゴリーID"              → categoryId
//   "商品名"                    → productName  (【必須】・※ 除去済み)
//   "価格"                      → unitPrice    (【必須】・※ 除去済み)
//   "商品コード"                → productCode  (※ 除去済み)
//   "バリエーション（種別1）"   → variant.variationType1
//   "バリエーション（種別2）"   → variant.variationType2
//   "バーコード"                → variant.barcode
//   "表示/非表示"               → isVisible
// ─────────────────────────────────────────────────────────────────────────────

export async function importCatalogCsvAction(
  _prev: AirregiImportResult | null,
  formData: FormData
): Promise<AirregiImportResult> {
  const importedAt = new Date().toISOString();

  const file = formData.get("csv");
  const isFile = file instanceof File && file.size > 0;

  // ── CP932 判定ログ ──────────────────────────────────────────────────────
  if (isFile) {
    const buf   = await (file as File).arrayBuffer();
    const bytes = new Uint8Array(buf.slice(0, 3));
    const hasBom = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
    console.log("[Airレジ CSVimport] 文字コード判定:", hasBom ? "UTF-8 BOM あり" : "BOMなし → Shift-JIS(CP932)で読込");
  }

  const csvText = await readCsvFile(formData);
  if (!csvText) {
    return {
      type: "products", importedAt, rowCount: 0,
      total: 0, linked: 0, unlinked: 0, skipped: 0,
      errors: 1, errorDetails: ["ファイルが選択されていません"],
    };
  }

  // 軽量正規化（括弧を保持）で全行を取得
  const rows = parseCsvToObjectsRaw(csvText);
  if (rows.length === 0) {
    return {
      type: "products", importedAt, rowCount: 0,
      total: 0, linked: 0, unlinked: 0, skipped: 0,
      errors: 1, errorDetails: ["データ行が見つかりませんでした。CSVのフォーマットを確認してください。"],
    };
  }

  // ── ヘッダー診断ログ ────────────────────────────────────────────────────
  const allHeaders = Object.keys(rows[0] ?? {});
  console.log("[Airレジ CSVimport] 認識ヘッダー一覧:", allHeaders);

  // 「商品コード」列の自動検出（完全一致 → 部分一致）
  const codeColExact   = allHeaders.find((h) => h === "商品コード");
  const codeColPartial = allHeaders.find((h) => h.includes("商品コード"));
  const codeColName    = codeColExact ?? codeColPartial ?? null;
  console.log("[Airレジ CSVimport] 商品コード列:", codeColName ?? "（未検出）");

  // ── 最初の5行の診断ログ ─────────────────────────────────────────────────
  console.log("[Airレジ CSVimport] 最初の5行サンプル:");
  rows.slice(0, 5).forEach((row, i) => {
    console.log(`  行${i + 2}: 商品ID="${row["商品ID"] ?? ""}" 商品名="${row["商品名"] ?? ""}" 商品コード="${codeColName ? (row[codeColName] ?? "") : "（列なし）"}"`);
  });

  // ── 既存 Airレジ商品レコードを取得（更新/新規判定用） ──────────────────
  const existing        = getAllAirregiProducts();
  const existingByCode  = new Map(existing.filter((p) => p.productCode).map((p) => [p.productCode, p]));
  const existingByExtId = new Map(existing.filter((p) => p.externalProductId).map((p) => [p.externalProductId!, p]));
  const existingByName  = new Map(existing.map((p) => [p.productName, p]));

  // ── 商品IDでグルーピング ──────────────────────────────────────────────
  // スキップ条件: 商品ID と 商品名 の両方が空の行のみスキップ（商品コード空はスキップしない）
  const groups = new Map<string, Record<string, string>[]>();
  const errorDetails: string[] = [];
  let skipped = 0;

  rows.forEach((row) => {
    const externalId = row["商品ID"];
    const name       = row["商品名"];
    if (!externalId && !name) {
      skipped++;
      return;
    }
    // 商品IDがない場合でも商品名があれば商品名をグループキーにして取り込む
    const groupKey = externalId || `name:${name}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(row);
  });

  // ── 商品ID単位で集約 → レコード生成 ──────────────────────────────────
  const records: AirregiProductRecord[] = [];
  let updatedByCode = 0, updatedByExtId = 0, added = 0, noCodeCount = 0;

  for (const [groupKey, group] of groups) {
    const firstRow = group[0];
    const name = firstRow["商品名"];
    if (!name) {
      errorDetails.push(`商品ID "${groupKey}": 商品名が取得できません`);
      continue;
    }

    const externalId  = firstRow["商品ID"] || undefined;
    const productCode = codeColName ? (firstRow[codeColName] ?? "").trim() : "";
    if (!productCode) noCodeCount++;

    const categoryId   = firstRow["カテゴリーID"] || undefined;
    const isVisibleRaw = firstRow["表示/非表示"];
    const isVisible    = isVisibleRaw ? isVisibleRaw !== "非表示" : undefined;

    const priceRaw  = firstRow["価格"];
    const unitPrice = priceRaw ? parseFloat(priceRaw.replace(/[,¥円]/g, "")) : undefined;

    // バリエーション集約
    const variants: AirregiVariant[] = group.map((vRow) => {
      const vPriceRaw = vRow["価格"];
      const vPrice    = vPriceRaw ? parseFloat(vPriceRaw.replace(/[,¥円]/g, "")) : undefined;
      return {
        variationId:    vRow["バリエーションID"] ?? "",
        variationType1: vRow["バリエーション（種別1）"] || undefined,
        variationType2: vRow["バリエーション（種別2）"] || undefined,
        barcode:        vRow["バーコード"] || undefined,
        price:          vPrice && !isNaN(vPrice) ? vPrice : undefined,
      };
    });

    // ── 突合（商品コード → 商品ID → 商品名）────────────────────────────
    let match: AirregiProductRecord | undefined;
    let matchType: "code" | "extId" | "name" | "none" = "none";

    if (productCode && existingByCode.has(productCode)) {
      match = existingByCode.get(productCode);
      matchType = "code";
    } else if (externalId && existingByExtId.has(externalId)) {
      match = existingByExtId.get(externalId);
      matchType = "extId";
    } else if (existingByName.has(name)) {
      match = existingByName.get(name);
      matchType = "name";
    }

    if      (matchType === "code")  { updatedByCode++; }
    else if (matchType === "extId" || matchType === "name") { updatedByExtId++; }
    else                            { added++; }

    records.push({
      id:                match?.id ?? `ar-cat-${Date.now()}-${records.length}`,
      productCode,
      productName:       name,
      externalProductId: externalId,
      categoryId,
      unitPrice:         unitPrice && !isNaN(unitPrice) ? unitPrice : undefined,
      isVisible,
      source:            "airregi_csv",
      variants,
      importedAt,
    });
  }

  console.log(`[Airレジ CSVimport] 完了: 行数=${rows.length} 集約商品=${records.length} updatedByCode=${updatedByCode} updatedByExtId=${updatedByExtId} added=${added} skipped=${skipped} noCode=${noCodeCount}`);

  saveAllAirregiProducts(records);
  revalidatePath("/");
  revalidatePath("/airregi");

  return {
    type:          "products",
    importedAt,
    rowCount:      rows.length,
    total:         records.length,
    linked:        updatedByCode + updatedByExtId,
    unlinked:      added,
    skipped,
    errors:        errorDetails.length,
    errorDetails,
    updatedByCode,
    updatedByExtId,
    noCodeCount,
  };
}
