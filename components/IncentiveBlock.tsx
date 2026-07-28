"use client";

import { useState } from "react";
import {
  resolveRule,
  ruleDescription,
  calcLineAmount,
  calcMultiLineAmount,
  MULTI_TOTAL_SALES_PERCENT,
} from "@/lib/incentiveRuleResolve";
import type { IncentiveRule } from "@/types/incentiveRule";
import type { IncentiveCategory } from "@/types/goodsIncentive";

export interface IncentiveGoodsInfo {
  category: IncentiveCategory;
  links: { wrestlerId: string; sharePercent: number }[];
}

interface Props {
  wrestlers: { id: string; name: string }[];
  rules: IncentiveRule[];
  /** 手売りでない場合のルール解決チャネル（商品・大会フォーム=venue / ECフォーム=ec） */
  baseChannel: "venue" | "ec";
  /** 手売りチェックを表示するか（ECフォームは false） */
  allowHand?: boolean;
  /** 現在選択中の商品のインセンティブ設定（未設定は null） */
  goodsIncentive: IncentiveGoodsInfo | null;
  sellingPrice: number;
  quantity: number;
  unitCost: number;
  saleDate: string;
}

function yen(n: number): string {
  return "¥" + n.toLocaleString("ja-JP");
}

const EXCLUDED_LABELS: Record<string, string> = {
  org: "団体共通グッズのため対象外（選手を指定すると帰属できます）",
};

/**
 * 売上登録フォームに組み込むインセンティブ入力ブロック。
 * 誰が売ったか（帰属選手）と売り方（手売りか）を選ぶと、その場で額をプレビューする。
 * 未指定の場合は商品×選手の紐付けに従って自動帰属する。
 */
export default function IncentiveBlock({
  wrestlers,
  rules,
  baseChannel,
  allowHand = true,
  goodsIncentive,
  sellingPrice,
  quantity,
  unitCost,
  saleDate,
}: Props) {
  const [wrestlerId, setWrestlerId] = useState<string>("");
  const [isHand, setIsHand] = useState<boolean>(false);
  const [handReported, setHandReported] = useState<boolean>(true);

  const revenue = sellingPrice * quantity;
  const grossProfit = (sellingPrice - unitCost) * quantity;
  const channel = isHand ? "hand" : baseChannel;

  // プレビュー計算（実際の集計は販売日時点のルールで再計算される）
  let preview: { text: string; amount: number | null; warn: boolean; costMissing?: boolean };
  // タッグ（複数選手）商品は選手指定に関わらず常に按分（手売りのみ例外）
  const isMulti = !isHand && goodsIncentive?.category === "multi";
  const links = isMulti
    ? goodsIncentive!.links
    : wrestlerId
      ? [{ wrestlerId, sharePercent: 100 }]
      : goodsIncentive?.category === "personal"
        ? goodsIncentive.links
        : null;

  if (isHand && !wrestlerId) {
    preview = { text: "手売りは「売った選手」の選択が必要です", amount: null, warn: true };
  } else if (isHand && !handReported) {
    preview = { text: "Lark申請なしの手売りはインセンティブ対象外です（売上・在庫のみ計上）", amount: null, warn: true };
  } else if (!wrestlerId && goodsIncentive?.category === "all") {
    preview = {
      text: "全選手展開商品です。「帰属選手の指定」で売れた選手を選んでください（未指定は集計対象外）",
      amount: null,
      warn: true,
    };
  } else if (isMulti && links && links.length > 0) {
    // 複数選手商品: 合計5%を按分（例: 2人均等なら2.5%ずつ）
    const total = links.reduce((s, l) => s + calcMultiLineAmount(revenue, l.sharePercent), 0);
    const names = links
      .map((l) => wrestlers.find((w) => w.id === l.wrestlerId)?.name ?? "?")
      .join("・");
    const note = wrestlerId ? " ※タッグ商品は選手指定に関わらず按分で計算されます" : "";
    preview = { text: `${names}（複数選手 ${MULTI_TOTAL_SALES_PERCENT}%を按分）${note}`, amount: total, warn: false };
  } else if (!links || links.length === 0) {
    const label = goodsIncentive
      ? EXCLUDED_LABELS[goodsIncentive.category] ?? "対象外"
      : "この商品は選手に紐付いていないため対象外（選手を指定すると帰属できます）";
    preview = { text: label, amount: null, warn: false };
  } else {
    let total = 0;
    let desc = "";
    let costMissing = false;
    let noRule = false;
    for (const link of links) {
      const rule = resolveRule(rules, link.wrestlerId, channel, saleDate);
      if (!rule) { noRule = true; continue; }
      total += calcLineAmount(rule, revenue, grossProfit, quantity, link.sharePercent).amount;
      if (!desc) desc = ruleDescription(rule, link.sharePercent);
      if (rule.basis === "profit" && unitCost === 0) costMissing = true;
    }
    const names = links
      .map((l) => wrestlers.find((w) => w.id === l.wrestlerId)?.name ?? "?")
      .join("・");
    preview = noRule && total === 0
      ? { text: "適用できるルールがありません", amount: null, warn: true }
      : { text: `${names}（${desc}）`, amount: total, warn: false, costMissing };
  }

  return (
    <section className="rounded border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">
        インセンティブ
        <span className="ml-2 text-xs font-normal text-gray-400">
          未指定の場合は商品の紐付けから自動で帰属します
        </span>
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-gray-500">
            {isHand ? "売った選手（必須）" : "帰属選手の指定（任意）"}
          </label>
          <select
            name="wrestlerOverrideId"
            value={wrestlerId}
            onChange={(e) => setWrestlerId(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">商品の紐付けに従う（自動）</option>
            {wrestlers.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        {allowHand && (
          <div className="space-y-2">
            <label className="mt-5 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="isHandSale"
                checked={isHand}
                onChange={(e) => setIsHand(e.target.checked)}
              />
              選手の手売り
              <span className="text-xs text-gray-400">（全グッズ対象10%・売った選手本人に帰属）</span>
            </label>
            {isHand && (
              <label className="flex items-center gap-2 rounded border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs text-yellow-800">
                <input
                  type="checkbox"
                  name="handSaleReported"
                  checked={handReported}
                  onChange={(e) => setHandReported(e.target.checked)}
                />
                Lark『グッズ管理』グループへ申請済み（連絡なしは対象外）
              </label>
            )}
          </div>
        )}
      </div>

      {/* プレビュー */}
      <div className={`mt-3 rounded px-3 py-2 text-sm ${
        preview.amount !== null
          ? "bg-blue-50 text-blue-800"
          : preview.warn ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"
      }`}>
        {preview.amount !== null ? (
          <>
            この売上のインセンティブ: <strong className="tabular-nums">{yen(preview.amount)}</strong>
            <span className="ml-2 text-xs">{preview.text}</span>
          </>
        ) : (
          preview.text
        )}
        {preview.costMissing && (
          <p className="mt-1 text-xs font-medium text-red-600">
            ⚠ 粗利ベースのルールですが原価が0円のため、金額が過大になる可能性があります。
          </p>
        )}
      </div>
    </section>
  );
}
