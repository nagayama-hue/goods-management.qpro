/**
 * 簡易CSVパーサー。
 * - UTF-8 BOM を除去
 * - ダブルクォートによるフィールドエスケープを処理
 * - Airレジ一括編集CSV のバージョン行（"v1300" 等）を自動スキップ
 * - 列名の【必須】プレフィックスおよび（注釈）サフィックスを正規化して返す
 * - ヘッダー行をキーとして { [列名]: 値 }[] を返す
 *
 * parseCsvToObjects       : 完全正規化（括弧も除去）— 一般 CSV 向け
 * parseCsvToObjectsRaw    : 軽量正規化（【必須】と ※ のみ除去、括弧は保持）
 *                           — バリエーション列など同一ベース名を持つ複数列を区別したい場合に使用
 */

/** 列名を正規化: 【必須】プレフィックス・※以降の注釈・（）括弧内を除去 */
function normalizeHeader(h: string): string {
  return h
    .trim()
    .replace(/^【[^】]*】\s*/, "")  // 【必須】など（直後スペースも除去）
    .replace(/\s*※[\s\S]*$/, "")    // ※以降の注釈をすべて除去
    .replace(/（[^）]*）/g, "")     // （レシート用）など全角括弧内を除去
    .replace(/\([^)]*\)/g, "")      // (注釈) など半角括弧内を除去
    .trim();
}

/** CSVテキストをオブジェクト配列に変換する */
export function parseCsvToObjects(csvText: string): Record<string, string>[] {
  // UTF-8 BOM 除去
  const text = csvText.startsWith("\uFEFF") ? csvText.slice(1) : csvText;

  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Airレジ 一括編集CSV の先頭バージョン行（"v1300,,,..." など）をスキップ
  // 先頭フィールドが v+数字 なら残りが空列でもバージョン行と判断する
  let headerLineIdx = 0;
  const firstRow = parseCsvRow(lines[0]);
  if (/^v\d+$/.test(firstRow[0].trim())) {
    headerLineIdx = 1;
  }
  if (lines.length <= headerLineIdx + 1) return [];

  const headers = parseCsvRow(lines[headerLineIdx]).map(normalizeHeader);
  const results: Record<string, string>[] = [];

  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue; // 空行スキップ
    const values = parseCsvRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      // 同名ヘッダーが複数ある場合は先に登場した列を優先
      if (!(h in obj)) obj[h] = (values[idx] ?? "").trim();
    });
    results.push(obj);
  }

  return results;
}

/**
 * 軽量正規化版パーサー。
 * 【必須】プレフィックスと ※ 以降の注釈のみ除去し、（） 括弧内は保持する。
 * バリエーション（種別1）/ バリエーション（種別2） のような同一ベース名の列を
 * 区別しながら読み込む必要がある Airレジ 商品一括編集CSV 向け。
 */
export function parseCsvToObjectsRaw(csvText: string): Record<string, string>[] {
  const text = csvText.startsWith("\uFEFF") ? csvText.slice(1) : csvText;
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  let headerLineIdx = 0;
  const firstRow = parseCsvRow(lines[0]);
  if (/^v\d+$/.test(firstRow[0].trim())) headerLineIdx = 1;
  if (lines.length <= headerLineIdx + 1) return [];

  // 【必須】と ※ 以降のみ除去、括弧は保持
  const headers = parseCsvRow(lines[headerLineIdx]).map((h) =>
    h.trim()
      .replace(/^【[^】]*】\s*/, "")
      .replace(/\s*※[\s\S]*$/, "")
      .trim()
  );

  const results: Record<string, string>[] = [];
  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const values = parseCsvRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (!(h in obj)) obj[h] = (values[idx] ?? "").trim();
    });
    results.push(obj);
  }
  return results;
}

/** CSV1行をフィールド配列に分割（ダブルクォート対応） */
function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        // エスケープされたダブルクォート
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ─── 列名エイリアス（Airレジ CSV の多様な列名に対応） ─────────────────

const ALIASES: Record<string, string[]> = {
  productCode:  ["商品コード", "コード", "品番", "品番コード", "SKU", "内部コード"],
  productName:  ["商品名", "商品名称", "品名", "アイテム名"],
  airregiId:    ["商品ID"],
  category:     ["カテゴリ", "カテゴリー", "商品分類", "分類名", "大分類", "部門"],
  categoryId:   ["カテゴリーID"],
  barcode:      ["バーコード", "JANコード", "JAN", "バーコード番号", "管理番号"],
  unitPrice:    ["販売価格", "単価", "価格", "税込価格", "税込単価", "売価"],
  costPrice:    ["原価"],
  isVisible:    ["表示/非表示"],
  currentStock: ["在庫数", "現在庫数", "残在庫数", "在庫", "数量"],
  salesQuantity:["販売数", "販売数量", "売上数量", "個数"],
  salesAmount:  ["売上金額", "売上", "金額", "税込売上金額", "税込売上"],
  periodStart:  ["期間開始", "開始日", "集計期間開始", "開始"],
  periodEnd:    ["期間終了", "終了日", "集計期間終了", "終了"],
};

/**
 * 行オブジェクトから指定フィールドの値を返す。
 * 複数の列名エイリアスを試して最初に見つかった値を返す。
 */
export function findValue(
  row: Record<string, string>,
  field: keyof typeof ALIASES
): string | undefined {
  for (const alias of ALIASES[field] ?? []) {
    const val = row[alias];
    if (val !== undefined) return val || undefined;
  }
  return undefined;
}
