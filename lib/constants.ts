import type { Priority } from "@/types/goods";

export const PRIORITY_OPTIONS: Priority[] = [
  "今すぐ作る",
  "次月候補",
  "保留",
  "却下",
  "未設定",
];

export const PRIORITY_STYLES: Record<Priority, string> = {
  "今すぐ作る": "bg-red-100 text-red-700",
  "次月候補":   "bg-orange-100 text-orange-700",
  "保留":       "bg-yellow-100 text-yellow-700",
  "却下":       "bg-gray-100 text-gray-400 line-through",
  "未設定":     "border border-gray-200 text-gray-400",
};
