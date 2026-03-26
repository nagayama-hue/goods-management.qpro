"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAllGoods, saveGoods } from "@/lib/store";
import { calcGoods } from "@/lib/calculations";
import { buildMonthlySuggestionContext } from "@/lib/buildMonthlySuggestionContext";
import { saveMonthlySuggestion } from "@/lib/monthlyStore";
import type { GoodsSuggestion } from "@/types/suggestion";
import type { Goods } from "@/types/goods";

function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const MONTHLY_SYSTEM_PROMPT = `
あなたは九州プロレスのグッズ企画責任者のアシスタントです。
毎月、「今月中に動くべきグッズ案」を提案します。

以下の観点を必ず反映してください：
- 直近3ヶ月のデータを最優先で参考にする
- HIT商品の共通点（カテゴリ・価格帯・チャネル）を活かす
- NG商品の失敗パターン（在庫過多・低粗利・低販売数）を避ける
- 粗利率は最低20%以上を目指す
- 在庫リスクが低い設計（受注生産・小ロット）を優先する
- 「なぜ今月作るべきか」を reason に必ず明記する

回答は必ず以下のJSON配列形式のみで返してください。前後に説明文は不要です。
[
  {
    "name": "商品名案",
    "category": "カテゴリ名（既存カテゴリから選ぶ）",
    "concept": "コンセプト（1〜2文）",
    "target": "想定ターゲット",
    "salesChannel": "会場 または EC または FC限定 または 会場+EC",
    "estimatedPrice": 価格（数値）,
    "estimatedCost": 原価（数値）,
    "estimatedProfit": 粗利（= 価格 - 原価）,
    "reason": "今月作るべき理由（データ根拠・タイミングを含む）",
    "dataInsight": "どのデータを根拠にしたか",
    "risk": "想定リスク（1〜2文）",
    "priority": "高 または 中 または 低"
  }
]
`.trim();

export async function generateMonthlySuggestion(): Promise<{ error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "ANTHROPIC_API_KEY が設定されていません。" };
  }

  const goods = getAllGoods().map(calcGoods);
  const context = buildMonthlySuggestionContext(goods);
  const currentMonth = toYearMonth(new Date());

  const userPrompt = `
現在の月は ${currentMonth} です。
以下のデータをもとに、今月中に企画・制作に着手すべきグッズ案を3〜5件提案してください。

---
${context}
---
`.trim();

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: MONTHLY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      return { error: "AIからの応答を解析できませんでした。" };
    }

    const raw = JSON.parse(match[0]) as Omit<GoodsSuggestion, "id">[];
    const suggestions: GoodsSuggestion[] = raw.map((s, i) => ({
      ...s,
      id: `monthly-${Date.now()}-${i}`,
    }));

    saveMonthlySuggestion({
      generatedAt: new Date().toISOString(),
      targetMonth: currentMonth,
      suggestions,
    });

    revalidatePath("/dashboard");
    return {};
  } catch (err) {
    const msg = err instanceof Error ? err.message : "不明なエラー";
    return { error: `API エラー: ${msg}` };
  }
}

export async function saveMonthlyGoodsItem(suggestion: GoodsSuggestion): Promise<void> {
  const now = new Date().toISOString();
  const goods: Goods = {
    id: `goods-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: suggestion.name,
    category: suggestion.category,
    concept: suggestion.concept,
    target: suggestion.target,
    salesChannel: suggestion.salesChannel,
    status: "案出し中",
    priority: suggestion.priority,
    memo: `【月次AI提案】${suggestion.reason}\n\n根拠: ${suggestion.dataInsight}\n\nリスク: ${suggestion.risk}`,
    budget: {
      budgetAmount: 0,
      designCost: 0,
      sampleCost: 0,
      manufacturingCost: suggestion.estimatedCost,
      shippingCost: 0,
      otherCost: 0,
    },
    sales: {
      sellingPrice: suggestion.estimatedPrice,
      productionCount: 0,
      salesCount: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  saveGoods(goods);
  redirect(`/goods/${goods.id}?saved=created`);
}
