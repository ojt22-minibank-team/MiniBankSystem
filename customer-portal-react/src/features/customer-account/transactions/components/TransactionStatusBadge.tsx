
import { useTranslation } from "react-i18next";
import { formatStatusLabel } from "../types/transactionHistoryTypes";

interface TransactionStatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-500/30",
  FAILED:
    "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-500/30",
};

const STATUS_I18N_KEYS: Record<string, string> = {
  COMPLETED: "completed",
  FAILED: "failed",
};

export default function TransactionStatusBadge({
  status,
}: TransactionStatusBadgeProps) {
  const { t } = useTranslation("transaction");

  const normalizedStatus = (status || "").trim().toUpperCase();
  const badgeClass =
    STATUS_STYLES[normalizedStatus] ||
    "bg-slate-50 text-slate-700 ring-slate-400/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700/50";

  const i18nKey = STATUS_I18N_KEYS[normalizedStatus];
  const displayLabel = i18nKey
    ? t(`detailContent.status.${i18nKey}`, {
        defaultValue: formatStatusLabel(status),
      })
    : formatStatusLabel(status) ||
      t("detailContent.status.unknown", {
        defaultValue: "Unknown",
      });

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeClass}`}
      aria-label={t("statusBadge.ariaLabel", {
        status: displayLabel,
      })}
    >
      <span
        className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
      {displayLabel}
    </span>
  );
}
