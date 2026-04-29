import { statusLabel } from "@/lib/format";

const COLORS: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-900",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = COLORS[status] ?? COLORS["todo"];
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}
      data-testid={`badge-status-${status}`}
    >
      {statusLabel(status)}
    </span>
  );
}
