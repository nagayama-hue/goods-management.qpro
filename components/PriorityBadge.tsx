import type { Priority } from "@/types/goods";
import { PRIORITY_STYLES } from "@/lib/constants";

interface Props {
  priority: Priority;
}

export default function PriorityBadge({ priority }: Props) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[priority]}`}
    >
      {priority}
    </span>
  );
}
