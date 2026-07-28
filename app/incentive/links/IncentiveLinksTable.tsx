"use client";

import { useState, useTransition } from "react";
import type { WrestlerLink } from "@/types/goodsIncentive";

interface GoodsRow {
  id: string;
  name: string;
  category: string | null; // null = 未設定
  links: WrestlerLink[];
}

interface WrestlerOption {
  id: string;
  name: string;
}

interface Props {
  goods: GoodsRow[];
  wrestlers: WrestlerOption[];
  saveAction: (
    goodsId: string,
    category: string,
    links: WrestlerLink[]
  ) => Promise<{ ok: boolean; error?: string }>;
  clearAction: (goodsId: string) => Promise<{ ok: boolean }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  personal: "個人グッズ（5%）",
  multi: "複数選手・タッグ（5%を按分）",
  all: "全選手展開（売上登録時に選手を指定）",
  org: "団体共通（対象外）",
};

/** 均等按分を再計算（先頭が端数を吸収して合計100を保つ） */
function equalSplit(links: WrestlerLink[]): WrestlerLink[] {
  const n = links.length;
  if (n === 0) return links;
  const base = Math.floor(100 / n);
  return links.map((l, i) => ({ ...l, sharePercent: i === 0 ? 100 - base * (n - 1) : base }));
}

function Row({ goods, wrestlers, saveAction, clearAction }: {
  goods: GoodsRow;
  wrestlers: WrestlerOption[];
  saveAction: Props["saveAction"];
  clearAction: Props["clearAction"];
}) {
  const [category, setCategory] = useState<string>(goods.category ?? "");
  const [links, setLinks] = useState<WrestlerLink[]>(goods.links);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const isUnset = goods.category === null;
  const shareSum = links.reduce((s, l) => s + l.sharePercent, 0);

  function handleCategoryChange(next: string) {
    setCategory(next);
    setMessage(null);
    if (next === "personal" && links.length > 1) setLinks([{ ...links[0], sharePercent: 100 }]);
    if (next === "personal" && links.length === 1) setLinks([{ ...links[0], sharePercent: 100 }]);
    if (next === "org" || next === "all") setLinks([]);
  }

  function toggleWrestler(wid: string) {
    setMessage(null);
    if (category === "personal") {
      setLinks([{ wrestlerId: wid, sharePercent: 100 }]);
      return;
    }
    const has = links.some((l) => l.wrestlerId === wid);
    const next = has
      ? links.filter((l) => l.wrestlerId !== wid)
      : [...links, { wrestlerId: wid, sharePercent: 0 }];
    setLinks(equalSplit(next));
  }

  function setShare(wid: string, value: number) {
    setMessage(null);
    setLinks(links.map((l) => (l.wrestlerId === wid ? { ...l, sharePercent: value } : l)));
  }

  function save() {
    startTransition(async () => {
      const result = await saveAction(goods.id, category, links);
      setMessage(result.ok ? { ok: true, text: "保存しました" } : { ok: false, text: result.error ?? "保存に失敗しました" });
    });
  }

  function clear() {
    startTransition(async () => {
      await clearAction(goods.id);
      setCategory("");
      setLinks([]);
      setMessage({ ok: true, text: "未設定に戻しました" });
    });
  }

  return (
    <tr className={isUnset ? "bg-yellow-50/60" : ""}>
      <td className="min-w-[200px] px-4 py-3 align-top text-gray-800">
        {goods.name}
        {isUnset && (
          <span className="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">未設定</span>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <select
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="w-full max-w-[220px] rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="">— 区分を選択 —</option>
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 align-top">
        {category === "org" || category === "all" || category === "" ? (
          <span className="text-xs text-gray-400">
            {category === "org"
              ? "紐付けなし（団体共通）"
              : category === "all"
                ? "紐付け不要 — 売上登録時に「帰属選手の指定」で売れた選手を選びます"
                : "—"}
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {wrestlers.map((w) => {
              const link = links.find((l) => l.wrestlerId === w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => toggleWrestler(w.id)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                    link
                      ? "border-blue-400 bg-blue-50 font-medium text-blue-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {w.name}
                  {link && category === "multi" && (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={link.sharePercent}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setShare(w.id, Math.max(0, Math.min(100, Number(e.target.value))))}
                      className="w-12 rounded border border-blue-200 px-1 py-0.5 text-xs"
                    />
                  )}
                  {link && category === "multi" && "%"}
                </button>
              );
            })}
            {category === "multi" && links.length > 0 && shareSum !== 100 && (
              <span className="text-xs font-medium text-red-500">⚠ 按分合計 {shareSum}%</span>
            )}
          </div>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-top">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={isPending || category === ""}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {isPending ? "..." : "保存"}
          </button>
          {!isUnset && (
            <button
              type="button"
              onClick={clear}
              disabled={isPending}
              className="text-xs text-gray-400 hover:text-red-500 hover:underline"
            >
              未設定に戻す
            </button>
          )}
        </div>
        {message && (
          <p className={`mt-1 text-xs ${message.ok ? "text-green-600" : "text-red-500"}`}>
            {message.text}
          </p>
        )}
      </td>
    </tr>
  );
}

export default function IncentiveLinksTable({ goods, wrestlers, saveAction, clearAction }: Props) {
  return (
    <div className="overflow-x-auto rounded border border-gray-200 bg-white">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-xs text-gray-500">
            <th className="px-4 py-3 text-left font-medium">商品名</th>
            <th className="px-4 py-3 text-left font-medium">インセンティブ区分</th>
            <th className="px-4 py-3 text-left font-medium">紐付け選手（クリックで切替）／按分%</th>
            <th className="px-4 py-3 text-left font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {goods.map((g) => (
            <Row key={g.id} goods={g} wrestlers={wrestlers} saveAction={saveAction} clearAction={clearAction} />
          ))}
          {goods.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">
                該当する商品がありません。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
