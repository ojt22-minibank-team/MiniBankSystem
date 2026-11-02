import { formatStatusLabel } from "../types/transactionHistoryTypes";

interface TransactionStatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-500/30",
  REVERSED:
    "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-950/40 dark:text-indigo-400 dark:ring-indigo-500/30",
  FAILED:
    "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-500/30",
  REJECTED:
    "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-500/30",
  PENDING_AUTHORIZATION:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-500/30",
  INITIATED:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-500/30",
  HELD:
    "bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-950/40 dark:text-purple-400 dark:ring-purple-500/30",
  CANCELLED:
    "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700/50",
};

export default function TransactionStatusBadge({ status }: TransactionStatusBadgeProps) {
  const normalizedStatus = (status || "").toUpperCase();
  const badgeClass =
    STATUS_STYLES[normalizedStatus] ||
    "bg-slate-50 text-slate-700 ring-slate-400/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700/50";
  const displayLabel = formatStatusLabel(status) || "Unknown";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeClass}`}
      aria-label={`Transaction status: ${displayLabel}`}
    >
      <span
        className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
      {displayLabel}
    </span>
  );
}
