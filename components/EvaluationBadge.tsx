import type { EvaluationLevel } from "@/types/goods";

const STYLES: Record<EvaluationLevel, string> = {
  OK:   "bg-green-100 text-green-700",
  WARN: "bg-yellow-100 text-yellow-700",
  NG:   "bg-red-100 text-red-700",
};

interface Props {
  level: EvaluationLevel;
}

export default function EvaluationBadge({ level }: Props) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${STYLES[level]}`}>
      {level}
    </span>
  );
}
