import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { mapHistoryItemToTransferReceiptData } from "../../transactions/utils/transactionReceiptAdapter";
import type { TransferReceiptData } from "../../../transfer/types/transferReceiptTypes";
import { ChevronDown, Check, ChevronRight } from "lucide-react";
import { getTransactions } from "../../transactions/services/transactionHistoryService";
import type { CusTransactionHistoryItemDTO } from "../../transactions/types/transactionHistoryTypes";
import {
  formatTransactionDateTime,
  formatTransactionAmount,
  formatTypeLabel,
} from "../../transactions/types/transactionHistoryTypes";
import TransactionStatusBadge from "../../transactions/components/TransactionStatusBadge";

interface RecentTransactionsProps {
  accountNumber?: string;
  showBalance?: boolean;
}

type PeriodFilter = "today" | "week" | "month" | "all";

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  all: "All Time",
};

export default function RecentTransactions({
  accountNumber,
  showBalance = true,
}: RecentTransactionsProps) {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<CusTransactionHistoryItemDTO[]>([]);

  const isTransfer = (tx: CusTransactionHistoryItemDTO): boolean => {
    const normType = (tx.transactionType || "").toUpperCase();
    const ref = (tx.transactionRef || "").toUpperCase();
    return (
      normType === "INTERNAL_TRANSFER" ||
      normType.includes("TRANSFER") ||
      ref.startsWith("TXN-P2P") ||
      ref.startsWith("TXN-TRANSFER")
    );
  };

  const handleRowClick = (tx: CusTransactionHistoryItemDTO) => {
    if (isTransfer(tx)) {
      const rawReceipt = mapHistoryItemToTransferReceiptData(tx);
      const receiptData: TransferReceiptData = {
        ...rawReceipt,
        sourceAccountNumber:
          tx.direction === "OUT"
            ? (tx.sourceAccountNumber || accountNumber || rawReceipt.sourceAccountNumber)
            : (tx.sourceAccountNumber || rawReceipt.sourceAccountNumber),
        destinationAccountNumber:
          tx.direction === "IN"
            ? (tx.destinationAccountNumber || accountNumber || rawReceipt.destinationAccountNumber)
            : (tx.destinationAccountNumber || rawReceipt.destinationAccountNumber),
      };

      navigate(`/receipt/${encodeURIComponent(tx.transactionRef)}`, {
        state: {
          receiptData,
          from: "/dashboard",
        },
      });
    } else {
      navigate("/transaction");
    }
  };
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>("month");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!accountNumber) return;

    let isMounted = true;
    const fetchRecent = async () => {
      try {
        setLoading(true);
        const data = await getTransactions({
          accountNumber,
          size: 25,
          page: 0,
        });
        if (isMounted && data && Array.isArray(data.content)) {
          setTransactions(data.content);
        }
      } catch (err) {
        console.error("Failed to load dashboard recent transactions:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchRecent();
    return () => {
      isMounted = false;
    };
  }, [accountNumber]);

  // Real-time client-side date filter
  const filteredTransactions = useMemo(() => {
    if (period === "all") return transactions;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const currentDay = now.getDay();
    const daysSinceMonday = (currentDay + 6) % 7;
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return transactions.filter((tx) => {
      const rawDate = tx.transactionDate || tx.initiatedAt;
      if (!rawDate) return false;
      const txDate = new Date(rawDate);
      if (isNaN(txDate.getTime())) return false;

      if (period === "today") {
        return txDate >= startOfToday;
      }
      if (period === "week") {
        return txDate >= startOfWeek;
      }
      if (period === "month") {
        return txDate >= startOfMonth;
      }
      return true;
    });
  }, [transactions, period]);

  const displayItems = filteredTransactions.slice(0, 5);

  return (
    <div className="flex flex-col rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0A192F] p-5 sm:p-6 shadow-xs transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <h3 className="text-base sm:text-lg font-extrabold text-[#0A192F] dark:text-white">
          Recent Transactions
        </h3>

        <div className="flex items-center gap-3">
          {/* Time Filter Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00A3C4]/30 cursor-pointer"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              <span>{PERIOD_LABELS[period]}</span>
              <ChevronDown
                size={13}
                className={`text-slate-400 dark:text-slate-400 transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180 text-[#00A3C4]" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-36 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-lg ring-1 ring-black/5 z-30">
                {(["today", "week", "month", "all"] as PeriodFilter[]).map((p) => {
                  const isSelected = period === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setPeriod(p);
                        setDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                        isSelected
                          ? "bg-slate-100 dark:bg-slate-700 text-[#00A3C4] font-bold"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <span>{PERIOD_LABELS[p]}</span>
                      {isSelected && <Check size={13} className="text-[#00A3C4]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Standard Single "See All" link in Header */}
          <Link
            to="/transaction"
            className="text-xs font-bold text-[#00A3C4] transition hover:text-[#0891B2] hover:underline"
          >
            See All
          </Link>
        </div>
      </div>

      {/* Transactions List Matching Transaction History UI/UX */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {/* Loading Skeletons */}
        {loading && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6 py-4 px-2 sm:px-3 animate-pulse"
              >
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-48 sm:w-60 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-36 sm:w-48 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="flex flex-col items-start sm:items-end justify-center gap-1.5 shrink-0">
                  <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && displayItems.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              No transactions found for {PERIOD_LABELS[period].toLowerCase()}.
            </p>
            {period !== "all" && (
              <button
                type="button"
                onClick={() => setPeriod("all")}
                className="mt-2 text-xs font-bold text-[#00A3C4] hover:underline cursor-pointer"
              >
                View all transactions
              </button>
            )}
          </div>
        )}

        {/* Populated Transaction Rows */}
        {!loading &&
          displayItems.map((tx) => {
            const primaryTitle =
              tx.displayTitle && tx.displayTitle.trim().length > 0
                ? tx.displayTitle.trim()
                : tx.description && tx.description.trim().length > 0
                  ? tx.description.trim()
                  : formatTypeLabel(tx.transactionType) || "Transaction";

            const rawDate = tx.transactionDate || tx.initiatedAt;
            const displayDate = formatTransactionDateTime(rawDate);
            const displayType = formatTypeLabel(tx.transactionType);

            return (
              <div
                key={tx.transactionRef}
                onClick={() => handleRowClick(tx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRowClick(tx);
                  }
                }}
                className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6 py-4 px-2 sm:px-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer rounded-xl select-none"
                aria-label={`View transaction ${primaryTitle}`}
              >
                {/* LEFT SECTION: Display Title + Date & Type */}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white break-words group-hover:text-[#00A3C4] transition-colors">
                    {primaryTitle}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>{displayDate}</span>
                    <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                      •
                    </span>
                    <span>{displayType}</span>
                  </div>
                </div>

                {/* RIGHT SECTION: Signed Amount + Status Badge + Chevron Arrow */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0 justify-between sm:justify-end">
                  <div className="flex flex-col items-start sm:items-end justify-center gap-1.5 shrink-0">
                    {/* Primary Line: Signed Amount */}
                    <div className="text-sm sm:text-base font-semibold tabular-nums text-slate-900 dark:text-white">
                      {!showBalance ? (
                        <span className="text-slate-400 dark:text-slate-500 tracking-wider">
                          ••••••••••
                        </span>
                      ) : (
                        formatTransactionAmount(tx.amount, tx.currency, tx.direction)
                      )}
                    </div>

                    {/* Secondary Line: Status Badge */}
                    <div>
                      <TransactionStatusBadge status={tx.status} />
                    </div>
                  </div>

                  {/* Chevron Right indicator */}
                  <ChevronRight
                    className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors shrink-0"
                    aria-hidden="true"
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
