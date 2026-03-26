"use server";

import Anthropic from "@anthropic-ai/sdk";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saveGoods, getAllGoods } from "@/lib/store";
import fs from "fs";
import path from "path";
import type { GoodsCalculated, Goods, Priority } from "@/types/goods";
import type { DerivativeSuggestion } from "@/types/suggestion";

/** 優先度を即時更新する */
export async function updatePriority(id: string, priority: Priority): Promise<void> {
  const DATA_PATH = path.join(process.cwd(), "data", "goods.json");
  const all = getAllGoods();
  const idx = all.findIndex((g) => g.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], priority, updatedAt: new Date().toISOString() };
  fs.writeFileSync(DATA_PATH, JSON.stringify(all, null, 2));
  revalidatePath(`/goods/${id}`);
  revalidatePath("/");
}

const SYSTEM_PROMPT = `
あなたは九州プロレスのグッズ企画担当です。
売れたHIT商品をもとに、派生商品案を提案してください。

以下の方針を守ってください：
- 元の商品より在庫リスクを下げる（小ロット・受注生産・バリエーション展開など）
- 制作コストを抑える（デザイン流用・素材変更など）
- 実現可能で具体的な案にする
- 粗利率は元商品以上を目指す

回答は必ず以下のJSON配列形式のみで返してください。前後に説明文は不要です。
[
  {
    "name": "派生商品名",
    "changePoint": "元商品からの変更ポイント（色・サイズ・素材・デザインなど具体的に）",
    "estimatedPrice": 価格（数値）,
    "estimatedCost": 原価（数値）,
    "estimatedProfit": 粗利（= 価格 - 原価）,
    "reason": "なぜ売れるか（2〜3文）",
    "risk": "想定リスク（1文）"
  }
]
`.trim();

export async function generateDerivativeSuggestions(
  goods: GoodsCalculated
): Promise<{ suggestions: DerivativeSuggestion[]; error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { suggestions: [], error: "ANTHROPIC_API_KEY が設定されていません。" };
  }

  const inventoryRate =
    goods.sales.productionCount > 0
      ? goods.stockCount / goods.sales.productionCount
      : 0;

  const userPrompt = `
以下のHIT商品をもとに、派生商品案を3〜5件提案してください。

## 元商品データ
商品名: ${goods.name}
カテゴリ: ${goods.category}
コンセプト: ${goods.concept || "未設定"}
ターゲット: ${goods.target || "未設定"}
販売チャネル: ${goods.salesChannel}
販売価格: ¥${goods.sales.sellingPrice.toLocaleString()}
製造原価: ¥${goods.budget.manufacturingCost.toLocaleString()}
販売数: ${goods.sales.salesCount}個
粗利率: ${(goods.grossMargin * 100).toFixed(1)}%
在庫率: ${(inventoryRate * 100).toFixed(1)}%
`.trim();

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      return { suggestions: [], error: "AIからの応答を解析できませんでした。" };
    }

    const raw = JSON.parse(match[0]) as Omit<DerivativeSuggestion, "id">[];
    const suggestions: DerivativeSuggestion[] = raw.map((s, i) => ({
      ...s,
      id: `derive-${Date.now()}-${i}`,
    }));

    return { suggestions };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "不明なエラー";
    return { suggestions: [], error: `API エラー: ${msg}` };
  }
}

export async function saveDerivativeAsGoods(
  base: GoodsCalculated,
  suggestion: DerivativeSuggestion
): Promise<void> {
  const now = new Date().toISOString();
  const goods: Goods = {
    id: `goods-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: suggestion.name,
    category: base.category,
    concept: suggestion.changePoint,
    target: base.target,
    salesChannel: base.salesChannel,
    status: "案出し中",
    priority: "未設定",
    memo: `【派生提案】元商品: ${base.name}\n変更ポイント: ${suggestion.changePoint}\n理由: ${suggestion.reason}\nリスク: ${suggestion.risk}`,
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
