interface Props {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  subColor?: string;
}

export default function KpiCard({ label, value, sub, valueColor = "text-gray-900", subColor }: Props) {
  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${valueColor}`}>{value}</p>
      {sub && <p className={`mt-0.5 text-xs tabular-nums ${subColor ?? "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}
