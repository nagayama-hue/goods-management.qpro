"use client";

import { useTransition } from "react";
import { updatePriority } from "@/app/goods/[id]/actions";
import type { Priority } from "@/types/goods";
import { PRIORITY_OPTIONS, PRIORITY_STYLES } from "@/lib/constants";

interface Props {
  goodsId: string;
  current: Priority;
}

export default function PrioritySelector({ goodsId, current }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleChange(priority: Priority) {
    if (priority === current) return;
    startTransition(() => updatePriority(goodsId, priority));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {PRIORITY_OPTIONS.map((p) => (
        <button
          key={p}
          onClick={() => handleChange(p)}
          disabled={isPending}
          className={`rounded px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-60 ${
            p === current
              ? `${PRIORITY_STYLES[p]} ring-2 ring-offset-1 ring-current`
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          {p === current && <span className="mr-1">✓</span>}
          {p}
        </button>
      ))}
    </div>
  );
}
