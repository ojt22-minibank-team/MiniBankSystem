
import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useLocation, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import type { CusTransactionHistoryItemDTO } from "../types/transactionHistoryTypes";
import { getTransactionDetail } from "../services/transactionHistoryService";
import TransactionDetailContent from "../components/TransactionDetailContent";

interface LocationState {
  transaction?: CusTransactionHistoryItemDTO;
  from?: string;
}

export default function TransactionDetailPage() {
  const { t } = useTranslation("transaction");

  const { transactionRef } = useParams<{ transactionRef: string }>();
  const [searchParams] = useSearchParams();
  const accountNumber = searchParams.get("accountNumber");
  const location = useLocation();
  const navigate = useNavigate();

  const locationState = location.state as LocationState | undefined;

  // Validate presence of required URL parameters
  const validationError = useMemo<string | null>(() => {
    if (!transactionRef || !transactionRef.trim()) {
      return t("detail.validation.referenceMissing");
    }
    if (!accountNumber || !accountNumber.trim()) {
      return t("detail.validation.accountMissing");
    }
    return null;
  }, [transactionRef, accountNumber, t]);

  // Fast path: if router state carries matching transaction and parameters are valid, display immediately
  const initialTransaction = useMemo<CusTransactionHistoryItemDTO | null>(() => {
    if (
      !validationError &&
      locationState?.transaction &&
      transactionRef &&
      locationState.transaction.transactionRef.toLowerCase() === transactionRef.toLowerCase()
    ) {
      return locationState.transaction;
    }
    return null;
  }, [validationError, locationState, transactionRef]);

  const [transaction, setTransaction] = useState<CusTransactionHistoryItemDTO | null>(initialTransaction);
  const [loading, setLoading] = useState<boolean>(!initialTransaction && !validationError);
  const [apiError, setApiError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const handleBack = useCallback(() => {
    if (locationState?.from) {
      navigate(-1);
    } else {
      navigate("/transaction");
    }
  }, [locationState?.from, navigate]);

  const handleRetry = () => {
    setApiError(null);
    setRetryCount((prev) => prev + 1);
  };

  useEffect(() => {
    // If validation failed or we already have the initial transaction on first mount, skip network fetch
    if (validationError || (initialTransaction && retryCount === 0)) {
      return;
    }

    const controller = new AbortController();

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setApiError(null);
        const data = await getTransactionDetail(
          transactionRef!.trim(),
          accountNumber!.trim(),
          controller.signal
        );
        setTransaction(data);
      } catch (err: unknown) {
        if (
          axios.isCancel(err) ||
          (err instanceof Error && (err.name === "CanceledError" || err.name === "AbortError"))
        ) {
          return;
        }

        if (axios.isAxiosError(err)) {
          const status = err.response?.status;
          if (status === 400) {
            setApiError(t("detail.errors.invalidReference"));
          } else if (status === 404) {
            setApiError(t("detail.errors.notFound"));
          } else if (status === 401) {
            setApiError(t("detail.errors.sessionExpired"));
          } else {
            setApiError(t("detail.errors.connection"));
          }
        } else {
          setApiError(t("detail.errors.unexpected"));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchDetail();

    return () => {
      controller.abort();
    };
  }, [transactionRef, accountNumber, retryCount, initialTransaction, validationError, t]);

  // Validation failure state (e.g. missing accountNumber or missing transactionRef)
  if (validationError) {
    return (
      <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-xl">
          <div
            role="alert"
            className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 sm:p-8 text-center space-y-4 shadow-xs"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-amber-900">
                {t("detail.validation.title")}
              </h2>
              <p className="text-xs sm:text-sm text-amber-800">{validationError}</p>
            </div>
            <div className="pt-2">
              <Link
                to="/transaction"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition-colors"
              >
                <span>{t("detail.returnToHistory")}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-xl">
        {/* Loading State / Skeleton */}
        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs animate-pulse space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="h-5 w-32 bg-slate-200 rounded-lg" />
              <div className="h-5 w-20 bg-slate-200 rounded-lg" />
            </div>
            <div className="flex flex-col items-center py-4 space-y-3">
              <div className="h-12 w-12 rounded-full bg-slate-200" />
              <div className="h-6 w-48 bg-slate-200 rounded-lg" />
              <div className="h-8 w-36 bg-slate-200 rounded-xl" />
            </div>
            <div className="space-y-3 pt-4">
              <div className="h-4 w-full bg-slate-200 rounded" />
              <div className="h-4 w-5/6 bg-slate-200 rounded" />
              <div className="h-4 w-4/6 bg-slate-200 rounded" />
            </div>
            <div className="flex items-center justify-center gap-2 pt-4 text-xs font-medium text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-[#0878E8]" />
              <span>{t("detail.loading")}</span>
            </div>
          </div>
        )}

        {/* Error State with Retry */}
        {!loading && apiError && (
          <div
            role="alert"
            className="rounded-3xl border border-rose-200 bg-rose-50/80 p-6 sm:p-8 text-center space-y-4 shadow-xs"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-rose-900">
                {t("detail.errors.title")}
              </h2>
              <p className="text-xs sm:text-sm text-rose-800">{apiError}</p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleRetry}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t("detail.retry")}</span>
              </button>
              <Link
                to="/transaction"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
              >
                <span>{t("detail.returnToHistory")}</span>
              </Link>
            </div>
          </div>
        )}

        {/* Content State */}
        {!loading && !apiError && transaction && (
          <TransactionDetailContent transaction={transaction} onBack={handleBack} />
        )}
      </div>
    </div>
  );
}
