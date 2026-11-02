import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { mapHistoryItemToTransferReceiptData } from "../../transactions/utils/transactionReceiptAdapter";
import type { TransferReceiptData } from "../../../transfer/types/transferReceiptTypes";
import { ChevronRight } from "lucide-react";
import { getTransactions } from "../../transactions/services/transactionHistoryService";
import type { CusTransactionHistoryItemDTO } from "../../transactions/types/transactionHistoryTypes";
import {
  formatTransactionDateTime,
  formatTransactionAmount,
  formatTypeLabel,
} from "../../transactions/types/transactionHistoryTypes";
import TransactionStatusBadge from "../../transactions/components/TransactionStatusBadge";
import type { DashboardAccount } from "../types/dashboardTypes";

interface RecentTransactionsProps {
  accounts?: DashboardAccount[];
}

export default function RecentTransactions({
  accounts,
}: RecentTransactionsProps) {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<CusTransactionHistoryItemDTO[]>([]);
  const [loading, setLoading] = useState(false);

  // User manual selection override (null means compute default)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  // Filter to active accounts only
  const activeAccounts = useMemo(() => {
    return (accounts || []).filter((acc) => acc.status === "ACTIVE");
  }, [accounts]);

  // Derive active account number using the standard hierarchy:
  // 1. If manual selection is set AND still exists in activeAccounts, keep it.
  // 2. Otherwise, prefer first ACTIVE CURRENT account.
  // 3. Otherwise, fallback to first ACTIVE account (e.g. SAVINGS).
  // 4. Otherwise, empty string "".
  const activeAccountNumber = useMemo(() => {
    if (selectedAccount !== null && activeAccounts.some((a) => a.accountNumber === selectedAccount)) {
      return selectedAccount;
    }

    const activeCurrent = activeAccounts.find((a) => a.accountType === "CURRENT");
    if (activeCurrent) {
      return activeCurrent.accountNumber;
    }

    const firstActive = activeAccounts[0];
    if (firstActive) {
      return firstActive.accountNumber;
    }

    return "";
  }, [selectedAccount, activeAccounts]);

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
            ? (tx.sourceAccountNumber || activeAccountNumber || rawReceipt.sourceAccountNumber)
            : (tx.sourceAccountNumber || rawReceipt.sourceAccountNumber),
        destinationAccountNumber:
          tx.direction === "IN"
            ? (tx.destinationAccountNumber || activeAccountNumber || rawReceipt.destinationAccountNumber)
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

  const displayTransactions = activeAccountNumber ? transactions : [];

  useEffect(() => {
    if (!activeAccountNumber) {
      return;
    }

    const controller = new AbortController();

    const fetchRecent = async () => {
      try {
        setLoading(true);
        const data = await getTransactions(
          {
            accountNumber: activeAccountNumber,
            size: 7,
            page: 0,
          },
          controller.signal
        );
        if (data && Array.isArray(data.content)) {
          setTransactions(data.content);
        } else {
          setTransactions([]);
        }
      } catch (err: unknown) {
        if (
          axios.isCancel(err) ||
          (err instanceof Error && (err.name === "CanceledError" || err.name === "AbortError"))
        ) {
          return;
        }
        console.error("Failed to load dashboard recent transactions:", err);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchRecent();

    return () => {
      controller.abort();
    };
  }, [activeAccountNumber]);

  return (
    <div className="flex flex-col rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0A192F] p-5 sm:p-6 shadow-xs transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <h3 className="text-base sm:text-lg font-extrabold text-[#0A192F] dark:text-white">
          Recent Transactions
        </h3>

        <div className="flex items-center gap-3">
          {/* Account Filter Dropdown */}
          <div className="relative">
            <select
              id="recent-transactions-account-select"
              aria-label="Select account for recent transactions"
              value={activeAccountNumber}
              onChange={(e) => setSelectedAccount(e.target.value)}
              disabled={activeAccounts.length === 0}
              className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00A3C4]/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activeAccounts.length === 0 ? (
                <option value="">No active accounts</option>
              ) : (
                activeAccounts.map((acc) => (
                  <option key={acc.accountNumber} value={acc.accountNumber}>
                    {acc.accountNumber} • {acc.accountType}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Standard Single "View Transactions" link in Header */}
          <Link
            to="/transaction"
            className="text-xs font-bold text-[#00A3C4] transition hover:text-[#0891B2] hover:underline shrink-0"
          >
            View Transactions
          </Link>
        </div>
      </div>

      {/* Transactions List Matching Transaction History UI/UX */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {/* Loading Skeletons */}
        {loading && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
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
        {!loading && displayTransactions.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {activeAccounts.length === 0
                ? "No active accounts available."
                : "No recent transactions found for this account."}
            </p>
          </div>
        )}

        {/* Populated Transaction Rows */}
        {!loading &&
          displayTransactions.map((tx) => {
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
                      {formatTransactionAmount(tx.amount, tx.currency, tx.direction)}
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
