"use server";
/**
 * 手動同期アクション（未使用・将来実装用）
 * 現在は接続設定と接続確認のみ有効。
 * 商品・在庫・売上の同期はここに実装予定。
 */
import { revalidatePath }                      from "next/cache";
import { getAirregiConfig, saveAirregiConfig } from "@/lib/airregiConfigStore";
import {
  fetchAirregiProducts,
  fetchAirregiStocks,
  fetchAirregiSales,
  extractCode,
  extractName,
  extractStock,
  extractSalesQty,
  extractSalesAmount,
  extractUnitPrice,
} from "@/lib/airregi/client";
import {
  saveAllAirregiProducts,
  saveAllAirregiStocks,
  saveAllAirregiSales,
} from "@/lib/airregiStore";
import { getAllGoods } from "@/lib/store";
import type {
  AirregiProductRecord,
  AirregiStockRecord,
  AirregiSalesRecord,
  AirregiSyncResult,
} from "@/types/airregi";

export async function syncAction(
  _prev: AirregiSyncResult | null,
  _formData: FormData
): Promise<AirregiSyncResult> {
  const config     = getAirregiConfig();
  const importedAt = new Date().toISOString();

  if (!config.isEnabled || !config.apiKey || !config.apiToken) {
    return {
      syncedAt: importedAt, productsTotal: 0, stocksTotal: 0, salesTotal: 0,
      matchedGoods: 0, unmatchedAir: 0, errors: 1,
      errorDetails: ["API設定が無効です。APIキーとアクセストークンを設定し、API連携を有効にしてください。"],
      status: "error", message: "API設定が無効です",
    };
  }

  const clientCfg  = { apiKey: config.apiKey, apiToken: config.apiToken, storeId: config.storeId || undefined };
  const goodsCodes = new Set(
    getAllGoods().map((g) => g.airregiProductCode).filter((c): c is string => Boolean(c))
  );

  const errorDetails:   string[]               = [];
  const productRecords: AirregiProductRecord[]  = [];
  const stockRecords:   AirregiStockRecord[]    = [];
  const salesRecords:   AirregiSalesRecord[]    = [];
  const matchedCodes    = new Set<string>();

  try {
    const raws = await fetchAirregiProducts(clientCfg);
    raws.forEach((p, i) => {
      const code = extractCode(p); const name = extractName(p);
      if (!code || !name) return;
      productRecords.push({
        id: `ar-p-api-${Date.now()}-${i}`, productCode: code, productName: name,
        category: typeof p.category === "string" ? p.category : typeof p.category_name === "string" ? p.category_name : undefined,
        barcode: typeof p.barcode === "string" ? p.barcode : undefined,
        unitPrice: extractUnitPrice(p), importedAt,
      });
      if (goodsCodes.has(code)) matchedCodes.add(code);
    });
    saveAllAirregiProducts(productRecords);
  } catch (e) { errorDetails.push(`商品取得: ${e instanceof Error ? e.message : String(e)}`); }

  try {
    const raws = await fetchAirregiStocks(clientCfg);
    raws.forEach((s, i) => {
      const code = extractCode(s); const name = extractName(s);
      if (!code) return;
      stockRecords.push({ id: `ar-s-api-${Date.now()}-${i}`, productCode: code, productName: name ?? code, currentStock: extractStock(s), importedAt });
      if (goodsCodes.has(code)) matchedCodes.add(code);
    });
    saveAllAirregiStocks(stockRecords);
  } catch (e) { errorDetails.push(`在庫取得: ${e instanceof Error ? e.message : String(e)}`); }

  try {
    const raws = await fetchAirregiSales(clientCfg);
    raws.forEach((s, i) => {
      const code = extractCode(s); const name = extractName(s);
      if (!code) return;
      salesRecords.push({ id: `ar-sa-api-${Date.now()}-${i}`, productCode: code, productName: name ?? code, salesQuantity: extractSalesQty(s), salesAmount: extractSalesAmount(s), importedAt });
      if (goodsCodes.has(code)) matchedCodes.add(code);
    });
    saveAllAirregiSales(salesRecords);
  } catch (e) { errorDetails.push(`売上取得: ${e instanceof Error ? e.message : String(e)}`); }

  const productsTotal = productRecords.length;
  const stocksTotal   = stockRecords.length;
  const salesTotal    = salesRecords.length;
  const matchedGoods  = matchedCodes.size;
  const allAirCodes   = new Set([...productRecords.map((p) => p.productCode), ...stockRecords.map((s) => s.productCode)]);
  const unmatchedAir  = [...allAirCodes].filter((c) => !goodsCodes.has(c)).length;
  const errors        = errorDetails.length;
  const status: AirregiSyncResult["status"] = errors === 0 ? "success" : (productsTotal > 0 || stocksTotal > 0) ? "partial" : "error";
  const message = status === "success" ? `同期成功: 商品${productsTotal}件・在庫${stocksTotal}件・売上${salesTotal}件`
    : status === "partial" ? `一部エラー: ${errorDetails[0]}` : `同期失敗: ${errorDetails[0] ?? "不明なエラー"}`;

  saveAirregiConfig({ ...config, lastSyncAt: importedAt, lastSyncStatus: status, lastSyncMessage: message });
  revalidatePath("/"); revalidatePath("/airregi"); revalidatePath("/goods", "layout");
  return { syncedAt: importedAt, productsTotal, stocksTotal, salesTotal, matchedGoods, unmatchedAir, errors, errorDetails, status, message };
}
