import type { GoodsCalculated } from "@/types/goods";
import { evaluateGoods, THRESHOLDS } from "@/lib/evaluation";
import { getCategoryAnalysis, getChannelAnalysis } from "@/lib/aggregations";

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}
function yen(v: number): string {
  return `¥${v.toLocaleString()}`;
}

/** YYYY-MM 形式の文字列を返す */
function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** 直近 N ヶ月の YYYY-MM 一覧を返す（当月含む） */
function recentMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(toYearMonth(d));
  }
  return months;
}

/**
 * 月次AI提案用のプロンプトコンテキストを生成する。
 * 全商品データと直近3ヶ月に絞ったサマリーの両方を含む。
 */
export function buildMonthlySuggestionContext(goods: GoodsCalculated[]): string {
  const lines: string[] = [];
  const currentMonth = toYearMonth(new Date());
  const recent3 = recentMonths(3);

  lines.push(`## 現在の月: ${currentMonth}`);

  // --- 直近3ヶ月の商品 ---
  const recentGoods = goods.filter(
    (g) => g.releaseDate && recent3.includes(g.releaseDate)
  );

  lines.push(`\n## 直近3ヶ月（${recent3[recent3.length - 1]}〜${recent3[0]}）の商品`);
  if (recentGoods.length === 0) {
    lines.push("- （直近3ヶ月の発売データなし）");
  } else {
    for (const g of recentGoods) {
      const ev = evaluateGoods(g);
      lines.push(
        `- ${g.name}｜${g.category}｜${g.releaseDate}発売｜評価:${ev.level}｜売上:${yen(g.revenue)}｜粗利率:${pct(g.grossMargin)}｜在庫率:${pct(g.stockCount / Math.max(g.sales.productionCount, 1))}`
      );
    }
  }

  // --- 全体のHIT / NG ---
  const hitGoods = goods.filter((g) => evaluateGoods(g).level === "OK");
  const ngGoods  = goods.filter((g) => evaluateGoods(g).level === "NG");

  lines.push(`\n## HIT商品（評価OK・全期間）`);
  if (hitGoods.length === 0) {
    lines.push("- （なし）");
  } else {
    for (const g of hitGoods) {
      lines.push(
        `- ${g.name}｜${g.category}｜粗利率:${pct(g.grossMargin)}｜チャネル:${g.salesChannel}｜価格:${yen(g.sales.sellingPrice)}`
      );
    }
  }

  lines.push(`\n## NG商品（評価NG・全期間）`);
  if (ngGoods.length === 0) {
    lines.push("- （なし）");
  } else {
    for (const g of ngGoods) {
      const ev = evaluateGoods(g);
      lines.push(
        `- ${g.name}｜${g.category}｜問題:${ev.reasons.join("・")}｜粗利率:${pct(g.grossMargin)}`
      );
    }
  }

  // --- カテゴリ別サマリー ---
  lines.push(`\n## カテゴリ別分析`);
  for (const row of getCategoryAnalysis(goods)) {
    lines.push(
      `${row.category}｜${row.count}件｜総粗利:${yen(row.totalGrossProfit)}｜平均粗利率:${pct(row.avgGrossMargin)}｜HIT:${row.hitCount}件 NG:${row.ngCount}件`
    );
  }

  // --- チャネル別サマリー ---
  lines.push(`\n## チャネル別分析`);
  for (const row of getChannelAnalysis(goods)) {
    lines.push(
      `${row.channel}｜売上:${yen(row.revenue)}｜粗利率:${pct(row.avgGrossMargin)}｜在庫率:${pct(row.avgInventoryRate)}`
    );
  }

  // --- しきい値 ---
  lines.push(`\n## 評価しきい値`);
  lines.push(`- 在庫率 ${pct(THRESHOLDS.inventoryRate)} 以上 → 在庫過多`);
  lines.push(`- 粗利率 ${pct(THRESHOLDS.grossMargin)} 以下 → 低粗利`);
  lines.push(`- 販売数 ${THRESHOLDS.salesCount}個 以下 → 低販売数`);

  return lines.join("\n");
}
