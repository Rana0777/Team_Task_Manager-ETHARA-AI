import { Flag } from "lucide-react";

const COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-900",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900",
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
};

export function PriorityBadge({ priority }: { priority: string }) {
  const cls = COLORS[priority] ?? COLORS["medium"];
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${cls}`}
      data-testid={`badge-priority-${priority}`}
    >
      <Flag className="h-3 w-3" />
      {priority}
    </span>
  );
}
