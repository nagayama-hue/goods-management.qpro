"use server";

import Anthropic from "@anthropic-ai/sdk";
import { redirect } from "next/navigation";
import { getAllGoods, saveGoods } from "@/lib/store";
import { addHistory, linkGoodsToHistory } from "@/lib/historyStore";
import type { SuggestionHistory } from "@/types/suggestionHistory";
import { calcGoods } from "@/lib/calculations";
import { buildSuggestionContext } from "@/lib/buildSuggestionContext";
import type { SuggestionConditions, GoodsSuggestion } from "@/types/suggestion";
import type { Goods } from "@/types/goods";

function generateId(): string {
  return `suggest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// データ分析ベース：過去の販売実績を踏まえた提案
const SYSTEM_PROMPT_DATA = `
あなたは九州プロレスのグッズ企画担当のアシスタントです。
過去の販売データと商品評価をもとに、売れる可能性が高いグッズ案を提案してください。

以下の観点を必ず反映してください：
- HIT商品のカテゴリ・価格帯・チャネルを参考にする
- NG商品の失敗パターン（在庫過多・低粗利・低販売数）を避ける
- 会場向き / EC向き / FC向きの特性を考慮する
- 粗利率は最低20%以上を目指す
- 在庫リスクが低い商品（受注生産・小ロット向き）を優先する

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
    "reason": "企画理由（2〜3文）",
    "dataInsight": "過去データとの関連（どのデータを根拠にしたか）",
    "risk": "想定リスク（1〜2文）",
    "priority": "今すぐ作る または 次月候補 または 保留"
  }
]
`.trim();

// 自由発想ベース：トレンド・市場・ファン文化など幅広い視点からの提案
const SYSTEM_PROMPT_FREE = `
あなたはプロレス・エンタメ・グッズ市場に精通した商品企画のエキスパートです。
九州プロレスのグッズ担当として、過去実績にとらわれず幅広い視点で新しいグッズ案を提案してください。

以下の観点を積極的に取り入れてください：
- 国内外のプロレス・スポーツ・アニメ・アイドルグッズの最新トレンド
- SNSで話題になりやすいユニークなコンセプト
- コアファン以外も手に取れる間口の広い商品
- 高単価でも満足度が高いプレミアム路線
- 低コストで粗利率が取れるデジタル・紙系グッズ
- コラボ・限定・季節企画など話題性を生む仕掛け
- 地元・九州らしさを活かしたご当地要素

既存の枠にとらわれず、チームが「これは面白い」と感じる提案をしてください。
dataInsight フィールドには「なぜこのアイデアが市場で通用するか」を記述してください。

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
    "reason": "企画理由（2〜3文）",
    "dataInsight": "市場・トレンドの根拠（なぜ売れると思うか）",
    "risk": "想定リスク（1〜2文）",
    "priority": "今すぐ作る または 次月候補 または 保留"
  }
]
`.trim();

export async function generateSuggestions(
  conditions: SuggestionConditions
): Promise<{ suggestions: GoodsSuggestion[]; error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { suggestions: [], error: "ANTHROPIC_API_KEY が設定されていません。.env.local に追加してください。" };
  }

  const goods = getAllGoods().map(calcGoods);
  const context = buildSuggestionContext(goods);

  const isFreeMode = conditions.mode === "free";
  const systemPrompt = isFreeMode ? SYSTEM_PROMPT_FREE : SYSTEM_PROMPT_DATA;

  const conditionText = [
    `提案件数: ${conditions.count}件`,
    conditions.categories.length > 0 ? `希望カテゴリ: ${conditions.categories.join("・")}` : "カテゴリ: 指定なし（全体から提案）",
    conditions.target   ? `ターゲット: ${conditions.target}`   : "ターゲット: 指定なし",
    conditions.channel  ? `チャネル: ${conditions.channel}`    : "チャネル: 指定なし",
    conditions.priceRange ? `価格帯: ${conditions.priceRange}` : "価格帯: 指定なし",
    conditions.freeComment ? `備考: ${conditions.freeComment}` : "",
  ].filter(Boolean).join("\n");

  // データ分析モードのみ既存データを注入する
  const dataSection = !isFreeMode
    ? `\n以下の販売データを参考にしてください。\n---\n${context}\n---\n`
    : "";

  const userPrompt = `
グッズ案を${conditions.count}件提案してください。
${dataSection}
## 提案条件
${conditionText}
`.trim();

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    // JSON 配列を抽出
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      return { suggestions: [], error: "AIからの応答を解析できませんでした。" };
    }

    const raw = JSON.parse(match[0]) as Omit<GoodsSuggestion, "id">[];
    const suggestions: GoodsSuggestion[] = raw.map((s) => ({ ...s, id: generateId() }));

    return { suggestions };
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return { suggestions: [], error: `API エラー: ${message}` };
  }
}

/** 提案セッションを履歴として保存し historyId を返す */
export async function saveHistoryAction(
  conditions: SuggestionConditions,
  suggestions: GoodsSuggestion[]
): Promise<{ historyId: string }> {
  const historyId = `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const history: SuggestionHistory = {
    id: historyId,
    createdAt: new Date().toISOString(),
    mode: conditions.mode,
    conditions,
    suggestions: suggestions.map((s) => ({ ...s, registeredGoodsId: undefined })),
  };
  addHistory(history);
  return { historyId };
}

/** 提案案を商品として登録し、履歴に紐付ける（直接登録→詳細ページへ） */
export async function saveSuggestion(
  suggestion: GoodsSuggestion,
  historyId?: string
): Promise<void> {
  const now = new Date().toISOString();
  const goodsId = `goods-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const goods: Goods = {
    id: goodsId,
    name: suggestion.name,
    category: suggestion.category,
    concept: suggestion.concept,
    target: suggestion.target,
    salesChannel: suggestion.salesChannel,
    status: "案出し中",
    priority: suggestion.priority,
    memo: `AI提案\n企画理由: ${suggestion.reason}\nリスク: ${suggestion.risk}\n根拠: ${suggestion.dataInsight}`,
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
  if (historyId) linkGoodsToHistory(historyId, suggestion.id, goodsId);
  redirect(`/goods/${goodsId}?saved=created`);
}

/** 登録して編集ページへ */
export async function saveSuggestionAndEdit(
  suggestion: GoodsSuggestion,
  historyId?: string
): Promise<void> {
  const now = new Date().toISOString();
  const goodsId = `goods-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const goods: Goods = {
    id: goodsId,
    name: suggestion.name,
    category: suggestion.category,
    concept: suggestion.concept,
    target: suggestion.target,
    salesChannel: suggestion.salesChannel,
    status: "案出し中",
    priority: suggestion.priority,
    memo: `AI提案\n企画理由: ${suggestion.reason}\nリスク: ${suggestion.risk}\n根拠: ${suggestion.dataInsight}`,
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
  if (historyId) linkGoodsToHistory(historyId, suggestion.id, goodsId);
  redirect(`/goods/${goodsId}/edit`);
}
