import type { ScoreLevel } from "@/types/score";

const LEVEL_STYLES: Record<ScoreLevel, string> = {
  高い: "bg-green-100 text-green-700",
  中:   "bg-yellow-100 text-yellow-700",
  低い: "bg-red-100 text-red-700",
};

interface Props {
  score: number;
  level: ScoreLevel;
  /** "sm" = テーブル向けコンパクト表示 / "md" = 詳細画面向け */
  size?: "sm" | "md";
}

export default function ScoreBadge({ score, level, size = "sm" }: Props) {
  const cls =
    size === "sm"
      ? "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
      : "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-semibold";

  return (
    <span className={`${cls} ${LEVEL_STYLES[level]}`}>
      <span className="tabular-nums">{score}</span>
      <span className="opacity-60 font-normal text-xs">/{level}</span>
    </span>
  );
}
