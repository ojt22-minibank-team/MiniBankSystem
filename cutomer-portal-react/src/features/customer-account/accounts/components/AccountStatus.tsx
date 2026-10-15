import type { AccountStatus as AccountStatusType } from "../../types/accountTypes";

interface AccountStatusProps {
  status: AccountStatusType;
}

const statusStyles: Record<AccountStatusType, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  DORMANT: "bg-slate-100 text-slate-600 ring-slate-500/20",
  FROZEN: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CLOSED: "bg-red-50 text-red-700 ring-red-600/20",
};

const statusLabels: Record<AccountStatusType, string> = {
  ACTIVE: "Active",
  DORMANT: "Dormant",
  FROZEN: "Frozen",
  CLOSED: "Closed",
};

export default function AccountStatus({
  status,
}: AccountStatusProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]}`}
      aria-label={`Account status: ${statusLabels[status]}`}
    >
      <span
        className="mr-2 h-1.5 w-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
      {statusLabels[status]}
    </span>
  );
}