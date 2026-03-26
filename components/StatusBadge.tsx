import type { GoodsStatus } from "@/types/goods";

const STATUS_STYLES: Record<GoodsStatus, string> = {
  案出し中: "bg-gray-100 text-gray-600",
  検討中:   "bg-purple-100 text-purple-700",
  採用:     "bg-blue-100 text-blue-700",
  制作中:   "bg-yellow-100 text-yellow-700",
  発売中:   "bg-green-100 text-green-700",
  完売:     "bg-teal-100 text-teal-700",
  終了:     "bg-slate-100 text-slate-500",
};

interface Props {
  status: GoodsStatus;
}

export default function StatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
