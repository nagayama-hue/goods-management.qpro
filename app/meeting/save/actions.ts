"use server";

import Anthropic from "@anthropic-ai/sdk";
import { redirect } from "next/navigation";
import { saveMeeting } from "@/lib/meetingStore";
import type { MeetingHistory, MeetingItem, MeetingResult, MeetingScope } from "@/types/meeting";
import type { Priority, GoodsStatus } from "@/types/goods";

// ─── AI会議メモ生成 ──────────────────────────────────────────────────────────

const MEMO_SYSTEM_PROMPT = `
あなたは九州プロレスのグッズ企画担当アシスタントです。
会議での商品判断結果をもとに、後から経緯を確認できる会議メモを日本語で作成してください。

以下の点を意識して記述してください：
- 採用・却下・保留・継続検討の判断を具体的に反映する
- 判断の背景や理由を推測ではなく入力されたコメントや優先度から読み取る
- 次アクションは採用商品を中心に具体的に記述する
- リスク・懸念は保留・継続検討の商品について言及する

必ず以下の構造で出力してください。見出し行（### から始まる行）はそのまま残し、
その直下に内容を記述してください。前後に余分な説明文は不要です。

### 今回の結論
### 判断理由
### 次アクション
### リスク・懸念
`.trim();

interface MemoItem {
  goodsName: string;
  priority:  Priority;
  status:    GoodsStatus;
  result:    MeetingResult;
  comment:   string;
}

interface GenerateMemoInput {
  name:  string;
  date:  string;
  items: MemoItem[];
}

export async function generateMeetingMemo(
  input: GenerateMemoInput
): Promise<{ ok: boolean; memo?: string; error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY が設定されていません。" };
  }

  const itemLines = input.items
    .map((item) => {
      const comment = item.comment ? `\n  コメント：${item.comment}` : "";
      return `- ${item.goodsName}（優先度：${item.priority} / ステータス：${item.status}）→ 【${item.result}】${comment}`;
    })
    .join("\n");

  const userPrompt = `
【会議名】${input.name || "（未入力）"}
【実施日】${input.date}

【商品判断一覧】
${itemLines}

上記の会議内容をもとに、会議メモを作成してください。
`.trim();

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 1024,
      system:     MEMO_SYSTEM_PROMPT,
      messages:   [{ role: "user", content: userPrompt }],
    });

    const memo = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return { ok: true, memo };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "不明なエラー";
    return { ok: false, error: `生成に失敗しました：${msg}` };
  }
}

export async function saveMeetingAction(formData: FormData) {
  const name             = (formData.get("name")         as string)?.trim();
  const date             = (formData.get("date")         as string)?.trim();
  const memo             = (formData.get("memo")         as string)?.trim() ?? "";
  const goodsIdsRaw      = (formData.get("goodsIds")     as string) ?? "";
  const scope            = (formData.get("scope")        as MeetingScope) ?? "filtered";
  const filterParamsRaw  = (formData.get("filterParams") as string) ?? "{}";

  if (!name || !date) throw new Error("会議名と実施日は必須です");

  const filterParams: Record<string, string> = (() => {
    try { return JSON.parse(filterParamsRaw); }
    catch { return {}; }
  })();

  const ids = goodsIdsRaw.split(",").filter(Boolean);

  const items: MeetingItem[] = ids.map((id) => ({
    goodsId:   id,
    goodsName: (formData.get(`goodsName_${id}`) as string) ?? "",
    priority:  (formData.get(`priority_${id}`) as Priority) ?? "未設定",
    status:    (formData.get(`status_${id}`)   as GoodsStatus) ?? "案出し中",
    result:    (formData.get(`result_${id}`)   as MeetingResult) ?? "継続検討",
    comment:   (formData.get(`comment_${id}`)  as string)?.trim() ?? "",
  }));

  const id = crypto.randomUUID();
  const meeting: MeetingHistory = {
    id,
    name,
    date,
    memo,
    createdAt:    new Date().toISOString(),
    scope,
    filterParams,
    items,
  };

  saveMeeting(meeting);
  redirect(`/meeting/history/${id}?saved=1`);
}
