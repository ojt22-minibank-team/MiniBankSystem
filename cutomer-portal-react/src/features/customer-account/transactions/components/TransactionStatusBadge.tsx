import { formatStatusLabel } from "../types/transactionHistoryTypes";

interface TransactionStatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  FAILED: "bg-red-50 text-red-700 ring-red-600/20",
  REJECTED: "bg-red-50 text-red-700 ring-red-600/20",
  PENDING_AUTHORIZATION: "bg-amber-50 text-amber-700 ring-amber-600/20",
  INITIATED: "bg-amber-50 text-amber-700 ring-amber-600/20",
  HELD: "bg-purple-50 text-purple-700 ring-purple-600/20",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export default function TransactionStatusBadge({ status }: TransactionStatusBadgeProps) {
  const normalizedStatus = (status || "").toUpperCase();
  const badgeClass =
    STATUS_STYLES[normalizedStatus] ||
    "bg-slate-50 text-slate-700 ring-slate-400/20";
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
