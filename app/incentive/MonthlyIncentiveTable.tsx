"use client";

import { Fragment, useState } from "react";
import type { WrestlerIncentive } from "@/lib/incentiveCalc";

function yen(n: number): string {
  return "¥" + n.toLocaleString("ja-JP");
}

const CHANNEL_BADGE: Record<string, string> = {
  大会: "bg-blue-50 text-blue-700",
  EC: "bg-purple-50 text-purple-700",
  単独: "bg-orange-50 text-orange-700",
};

export default function MonthlyIncentiveTable({ byWrestler }: { byWrestler: WrestlerIncentive[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (byWrestler.length === 0) {
    return (
      <div className="rounded border border-dashed border-gray-300 py-16 text-center text-sm text-gray-400">
        この月の対象売上がありません。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-gray-200 bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-xs text-gray-500">
            <th className="px-4 py-3 text-left font-medium">選手</th>
            <th className="px-4 py-3 text-right font-medium">対象販売数</th>
            <th className="px-4 py-3 text-right font-medium">対象額</th>
            <th className="px-4 py-3 text-right font-medium">インセンティブ額</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {byWrestler.map((w) => (
            <Fragment key={w.wrestlerId}>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{w.wrestlerName}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">{w.quantity}個</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">{yen(w.baseAmount)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-base font-bold text-gray-900">{yen(w.amount)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === w.wrestlerId ? null : w.wrestlerId)}
                    className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    {openId === w.wrestlerId ? "閉じる" : "明細"}
                  </button>
                </td>
              </tr>
              {openId === w.wrestlerId && (
                <tr>
                  <td colSpan={5} className="bg-gray-50/70 px-4 py-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500">
                          <th className="px-2 py-1.5 text-left font-medium">販売日</th>
                          <th className="px-2 py-1.5 text-left font-medium">商品</th>
                          <th className="px-2 py-1.5 text-left font-medium">チャネル</th>
                          <th className="px-2 py-1.5 text-right font-medium">数量</th>
                          <th className="px-2 py-1.5 text-right font-medium">対象額</th>
                          <th className="px-2 py-1.5 text-left font-medium">適用ルール</th>
                          <th className="px-2 py-1.5 text-right font-medium">金額</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {w.lines.map((l, i) => (
                          <tr key={i}>
                            <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-gray-600">{l.saleDate}</td>
                            <td className="px-2 py-1.5 text-gray-800">
                              {l.goodsName}
                              {l.variantLabel && <span className="ml-1 text-gray-400">（{l.variantLabel}）</span>}
                              {l.costMissing && (
                                <span className="ml-1 rounded bg-red-50 px-1 py-0.5 text-red-600">⚠ 原価未設定</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <span className={`rounded px-1.5 py-0.5 ${CHANNEL_BADGE[l.channelLabel] ?? "bg-gray-100 text-gray-600"}`}>
                                {l.channelLabel}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-gray-700">{l.quantity}個</td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-gray-700">{yen(l.baseAmount)}</td>
                            <td className="px-2 py-1.5 text-gray-600">{l.ruleDesc}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-gray-900">{yen(l.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
