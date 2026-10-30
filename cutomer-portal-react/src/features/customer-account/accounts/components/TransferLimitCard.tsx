import React, { useEffect, useState, useRef } from "react";
import {
  ShieldCheck,
  Sliders,
  AlertCircle,
  CheckCircle2,
  Lock,
  X,
  Loader2,
  Info,
  KeyRound,
} from "lucide-react";
import {
  getAccountTransferLimits,
  updateAccountTransferLimits,
} from "../api/customerAccountApi";
import type { TransferLimitInfo } from "../types/accountTypes";

interface TransferLimitCardProps {
  accountNumber: string;
  currency: string;
  onLimitsLoaded?: (limits: TransferLimitInfo) => void;
  onLimitsUpdated?: () => void;
  autoOpenModal?: boolean;
}

export const TransferLimitCard: React.FC<TransferLimitCardProps> = ({
  accountNumber,
  currency,
  onLimitsLoaded,
  onLimitsUpdated,
  autoOpenModal,
}) => {
  const [limits, setLimits] = useState<TransferLimitInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [customOneTime, setCustomOneTime] = useState<string>("");
  const [customDaily, setCustomDaily] = useState<string>("");
  const [pinDigits, setPinDigits] = useState<string[]>(Array(6).fill(""));
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  const fetchLimits = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAccountTransferLimits(accountNumber);
      setLimits(data);
      onLimitsLoaded?.(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load transfer limits.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountNumber) {
      fetchLimits();
    }
  }, [accountNumber]);

  const handleOpenModal = () => {
    if (!limits) return;
    setCustomOneTime(
      limits.userCustomOneTimeLimit ? String(limits.userCustomOneTimeLimit) : ""
    );
    setCustomDaily(
      limits.userCustomDailyLimit ? String(limits.userCustomDailyLimit) : ""
    );
    setPinDigits(Array(6).fill(""));
    setModalError(null);
    setModalSuccess(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
  };

  const autoOpenedRef = useRef<boolean>(false);

  useEffect(() => {
    if (autoOpenModal && limits && !loading && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      handleOpenModal();
    }
  }, [autoOpenModal, limits, loading]);

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const next = [...pinDigits];
    next[index] = digit;
    setPinDigits(next);
    if (digit && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill("");
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setPinDigits(next);
    const focusIndex = Math.min(pasted.length, 5);
    pinInputRefs.current[focusIndex]?.focus();
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    const transactionPin = pinDigits.join("");
    if (!transactionPin || transactionPin.length !== 6) {
      setModalError("Please enter your 6-digit transaction PIN.");
      return;
    }

    const oneTimeVal = customOneTime ? parseFloat(customOneTime) : null;
    const dailyVal = customDaily ? parseFloat(customDaily) : null;

    if (oneTimeVal !== null) {
      if (oneTimeVal <= 0) {
        setModalError("Custom one-time limit must be greater than zero.");
        return;
      }
      if (limits && oneTimeVal > limits.bankMaxOneTimeLimit) {
        setModalError(
          `Custom one-time limit cannot exceed Bank Maximum Limit of ${formatAmount(
            limits.bankMaxOneTimeLimit
          )} ${currency}.`
        );
        return;
      }
    }

    if (dailyVal !== null) {
      if (dailyVal <= 0) {
        setModalError("Custom daily limit must be greater than zero.");
        return;
      }
      if (limits && dailyVal > limits.bankMaxDailyLimit) {
        setModalError(
          `Custom daily limit cannot exceed Bank Maximum Daily Limit of ${formatAmount(
            limits.bankMaxDailyLimit
          )} ${currency}.`
        );
        return;
      }
    }

    if (oneTimeVal && dailyVal && oneTimeVal > dailyVal) {
      setModalError("One-time limit cannot be greater than the daily limit.");
      return;
    }

    try {
      setSubmitting(true);
      const updated = await updateAccountTransferLimits(accountNumber, {
        transactionPin: transactionPin.trim(),
        customOneTimeLimit: oneTimeVal,
        customDailyLimit: dailyVal,
      });

      setLimits(updated);
      setModalSuccess("Transfer limits updated successfully!");
      if (onLimitsUpdated) onLimitsUpdated();

      setTimeout(() => {
        setIsModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setModalError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update transfer limits. Please check your PIN."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatAmount = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "—";
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-center gap-3 py-10 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-[#00A3C4]" />
        <span className="text-sm font-medium">Loading transfer limits...</span>
      </div>
    );
  }

  if (error || !limits) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 text-xs text-red-600 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{error || "Could not retrieve limit data."}</span>
      </div>
    );
  }

  // Daily usage calculation
  const usedPercentage = Math.min(
    100,
    Math.round(
      (limits.todayTransferredAmount / Math.max(1, limits.effectiveDailyLimit)) *
        100
    )
  );

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-[#00A3C4]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0A192F] flex items-center gap-2">
                Transfer Limits & Safety
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Protected
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bank limits, custom safety ceilings & real-time daily usage
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#00A3C4] to-[#0284C7] hover:from-[#0891B2] hover:to-[#0369A1] shadow-sm shadow-cyan-500/25 transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize Limits</span>
          </button>
        </div>

        {/* Daily Cumulative Progress */}
        <div className="mt-5 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Today's Daily Transfer</span>
            <span className="font-bold text-[#0A192F]">
              {formatAmount(limits.todayTransferredAmount)} /{" "}
              {formatAmount(limits.effectiveDailyLimit)} {currency}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-200 rounded-full mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usedPercentage >= 90
                  ? "bg-red-500"
                  : usedPercentage >= 60
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${usedPercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
            <span>{usedPercentage}% used today</span>
            <span className="font-medium text-emerald-700">
              Remaining: <strong>{formatAmount(limits.remainingDailyLimit)} {currency}</strong>
            </span>
          </div>
        </div>

        {/* Limit Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-4">
          {/* Beneficiary One-Time Limit */}
          <div className="p-3.5 rounded-xl border border-slate-100 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                To Beneficiary (One-Time)
              </span>
              <span className="text-[10px] font-semibold text-[#00A3C4] bg-cyan-50 px-1.5 py-0.5 rounded">
                Saved Payee
              </span>
            </div>
            <p className="text-base font-bold text-[#0A192F] mt-1">
              {formatAmount(limits.effectiveOneTimeLimitBeneficiary)} {currency}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Bank Max: {formatAmount(limits.bankMaxOneTimeLimit)} {currency}
            </p>
          </div>

          {/* Stranger One-Time Limit */}
          <div className="p-3.5 rounded-xl border border-slate-100 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                To Stranger (One-Time)
              </span>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                Anti-Scam
              </span>
            </div>
            <p className="text-base font-bold text-[#0A192F] mt-1">
              {formatAmount(limits.effectiveOneTimeLimitStranger)} {currency}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Unsaved accounts are capped for protection
            </p>
          </div>
        </div>

        {/* User Custom Setting Indicators */}
        {(limits.userCustomOneTimeLimit || limits.userCustomDailyLimit) && (
          <div className="mt-3.5 px-3.5 py-2.5 rounded-xl bg-cyan-50/60 border border-cyan-100/70 flex items-center justify-between text-xs text-[#0A192F]">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#00A3C4] shrink-0" />
              <span>
                User-defined custom limits are currently active on this account.
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Customize Limits Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
            onClick={handleCloseModal}
          />

          {/* Dialog */}
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={handleCloseModal}
              disabled={submitting}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-[#00A3C4]">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Customize Transfer Limits
                </h3>
                <p className="text-xs text-slate-500">
                  Account: {accountNumber}
                </p>
              </div>
            </div>

            {modalSuccess ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-slate-900">{modalSuccess}</p>
                <p className="text-xs text-slate-500">
                  Your new transfer limits are now securely applied.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitUpdate} className="space-y-4 mt-4">
                {modalError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-start gap-2 border border-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Custom One-Time Limit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom One-Time Limit ({currency})
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      customOneTime
                        ? Number(customOneTime).toLocaleString("en-US")
                        : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setCustomOneTime(raw);
                    }}
                    placeholder={`e.g. 2,000,000 (Max: ${formatAmount(
                      limits.bankMaxOneTimeLimit
                    )})`}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:border-[#00A3C4] transition"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Bank ceiling: {formatAmount(limits.bankMaxOneTimeLimit)} {currency}
                  </span>
                </div>

                {/* Custom Daily Limit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Daily Limit ({currency})
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      customDaily
                        ? Number(customDaily).toLocaleString("en-US")
                        : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setCustomDaily(raw);
                    }}
                    placeholder={`e.g. 5,000,000 (Max: ${formatAmount(
                      limits.bankMaxDailyLimit
                    )})`}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:border-[#00A3C4] transition"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Bank ceiling: {formatAmount(limits.bankMaxDailyLimit)} {currency}
                  </span>
                </div>

                {/* Transaction PIN - 6 Individual Digit Boxes */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-[#00A3C4]" />
                      6-Digit Transaction PIN
                    </label>
                    <span className="text-[10px] text-slate-400">Security Verification</span>
                  </div>

                  <div className="flex justify-between items-center gap-2">
                    {pinDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          pinInputRefs.current[idx] = el;
                        }}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handlePinChange(idx, e.target.value)}
                        onKeyDown={(e) => handlePinKeyDown(idx, e)}
                        onPaste={handlePinPaste}
                        className={`w-11 h-12 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all ${
                          digit
                            ? "border-[#00A3C4] bg-cyan-50 text-[#00A3C4] ring-2 ring-blue-100"
                            : "border-slate-200 bg-slate-50 text-slate-800"
                        } focus:border-[#00A3C4] focus:bg-cyan-50 focus:ring-2 focus:ring-cyan-200`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 text-center">
                    Enter your 6-digit PIN to authorize the limit change
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || pinDigits.join("").length !== 6}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-[#00A3C4] hover:bg-[#0891B2] disabled:opacity-50 transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying PIN...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Confirm Update</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
