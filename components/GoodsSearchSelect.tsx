"use client";

import { useMemo, useState } from "react";

interface GoodsOption {
  id: string;
  name: string;
  category?: string;
}

interface Props {
  goodsList: GoodsOption[];
  value: string;
  onChange: (goodsId: string) => void;
  /** select に付ける name 属性（フォーム送信用） */
  name?: string;
}

/**
 * 商品名で絞り込めるセレクト。商品数が多いときの選択時間を短縮する。
 * 絞り込みは表示専用で、送信値は従来どおり select の value。
 */
export default function GoodsSearchSelect({ goodsList, value, onChange, name = "goodsId" }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return goodsList;
    return goodsList.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.category ?? "").toLowerCase().includes(q)
    );
  }, [goodsList, query]);

  // 絞り込み結果に選択中の商品が含まれない場合、先頭を自動選択して不整合を防ぐ
  function handleQueryChange(next: string) {
    setQuery(next);
    const q = next.trim().toLowerCase();
    if (!q) return;
    const list = goodsList.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.category ?? "").toLowerCase().includes(q)
    );
    if (list.length > 0 && !list.some((g) => g.id === value)) {
      onChange(list[0].id);
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="商品名・カテゴリで絞り込み"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        {query && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {filtered.length}件
          </span>
        )}
      </div>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size={filtered.length > 1 ? Math.min(filtered.length, 8) : undefined}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        {filtered.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
      {filtered.length === 0 && (
        <p className="text-xs text-orange-500">該当する商品がありません。検索条件を変えてください。</p>
      )}
    </div>
  );
}
