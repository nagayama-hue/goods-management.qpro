import type { GoodsCalculated } from "@/types/goods";
import { evaluateGoods, THRESHOLDS } from "@/lib/evaluation";
import { getCategoryAnalysis, getChannelAnalysis, getMonthlyAnalysis } from "@/lib/aggregations";

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}
function yen(v: number): string {
  return `¥${v.toLocaleString()}`;
}

/**
 * 既存の商品データから AI プロンプト用のサマリーテキストを生成する。
 * ページやAPIルートではなく、Server Action からのみ呼び出す。
 */
export function buildSuggestionContext(goods: GoodsCalculated[]): string {
  const lines: string[] = [];

  // --- HIT / NG 商品 ---
  const hitGoods = goods.filter((g) => evaluateGoods(g).level === "OK");
  const ngGoods  = goods.filter((g) => evaluateGoods(g).level === "NG");

  lines.push("## HIT商品（評価 OK）");
  if (hitGoods.length === 0) {
    lines.push("- （なし）");
  } else {
    for (const g of hitGoods) {
      lines.push(
        `- ${g.name}｜カテゴリ:${g.category}｜粗利率:${pct(g.grossMargin)}｜チャネル:${g.salesChannel}｜価格:${yen(g.sales.sellingPrice)}`
      );
    }
  }

  lines.push("\n## NG商品（問題あり）");
  if (ngGoods.length === 0) {
    lines.push("- （なし）");
  } else {
    for (const g of ngGoods) {
      const ev = evaluateGoods(g);
      const reasons = ev.reasons.join("・");
      lines.push(
        `- ${g.name}｜カテゴリ:${g.category}｜問題:${reasons}｜在庫率:${pct(g.stockCount / Math.max(g.sales.productionCount, 1))}｜粗利率:${pct(g.grossMargin)}`
      );
    }
  }

  // --- カテゴリ別 ---
  lines.push("\n## カテゴリ別分析");
  lines.push("カテゴリ | 商品数 | 総粗利 | 平均粗利率 | HIT | NG");
  for (const row of getCategoryAnalysis(goods)) {
    lines.push(
      `${row.category} | ${row.count}件 | ${yen(row.totalGrossProfit)} | ${pct(row.avgGrossMargin)} | ${row.hitCount} | ${row.ngCount}`
    );
  }

  // --- チャネル別 ---
  lines.push("\n## チャネル別分析");
  lines.push("チャネル | 商品数 | 売上 | 粗利率 | 平均在庫率");
  for (const row of getChannelAnalysis(goods)) {
    lines.push(
      `${row.channel} | ${row.count}件 | ${yen(row.revenue)} | ${pct(row.avgGrossMargin)} | ${pct(row.avgInventoryRate)}`
    );
  }

  // --- 月別トレンド ---
  const monthly = getMonthlyAnalysis(goods).filter((r) => r.month !== "未設定").slice(0, 6);
  if (monthly.length > 0) {
    lines.push("\n## 月別トレンド（発売月ベース・直近6ヶ月）");
    lines.push("月 | 商品数 | 売上 | 粗利 | NG件数");
    for (const row of monthly) {
      lines.push(
        `${row.month} | ${row.count}件 | ${yen(row.revenue)} | ${yen(row.totalGrossProfit)} | ${row.ngCount}`
      );
    }
  }

  // --- 評価しきい値（AIが参照できるよう明示） ---
  lines.push(`\n## 評価しきい値`);
  lines.push(`- 在庫率 ${pct(THRESHOLDS.inventoryRate)} 以上 → 在庫過多`);
  lines.push(`- 粗利率 ${pct(THRESHOLDS.grossMargin)} 以下 → 低粗利`);
  lines.push(`- 販売数 ${THRESHOLDS.salesCount}個 以下 → 低販売数`);

  return lines.join("\n");
}
