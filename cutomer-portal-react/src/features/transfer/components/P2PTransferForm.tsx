import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../lib/redux";
import { submitP2PTransfer, resetTransferState, clearTransferError } from "../store/transferSlice";
import { fetchMyAccounts } from "../../customer-account/accounts/stores/accountsSlice";
import { lookupDestinationAccount } from "../services/transferService";
import { getBeneficiaries, addBeneficiary } from "../../beneficiaries/services/beneficiaryService";
import type { Beneficiary } from "../../beneficiaries/types/beneficiaryTypes";
import type { P2PTransferRequest } from "../types/transferTypes";
import { getAccountTransferLimits } from "../../customer-account/accounts/api/customerAccountApi";
import type { TransferLimitInfo } from "../../customer-account/accounts/types/accountTypes";
import { getCurrentCustomerSubject } from "../../../utils/tokenStorage";
import TransferReceiptView from "./TransferReceiptView";
import TransferFailedSlip from "./TransferFailedSlip";
import { mapP2PResponseToReceiptData } from "../types/transferReceiptTypes";
import { toBlob } from "html-to-image";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  PlusCircle,
  ChevronLeft,
  Send,
  Wallet,
  X,
  Download,
  Share2,
  Home,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Lock,
  CreditCard,
  Pencil,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const maskAccount = (accNo: string): string => {
  if (!accNo || accNo.length < 4) return accNo;
  return `****  ****  ${accNo.slice(-4)}`;
};

const formatMMK = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n) + " MMK";

/* -------------------------------------------------------------------------- */
/* PIN Modal (6-Box UI with Auto-advance, Backspace, Paste)                   */
/* -------------------------------------------------------------------------- */

interface PinModalProps {
  loading: boolean;
  error: string | null;
  onConfirm: (pin: string) => void;
  onClose: () => void;
  onClearError?: () => void;
}

function PinModal({ loading, error, onConfirm, onClose, onClearError }: PinModalProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (error) {
      setDigits(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    }
  }, [error]);

  const handleChange = (index: number, value: string) => {
    if (error && onClearError) onClearError();
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (error && onClearError) onClearError();
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (error && onClearError) onClearError();
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill("");
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = () => {
    const pin = digits.join("");
    if (pin.length === 6) onConfirm(pin);
  };

  const pin = digits.join("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-[#0A192F] rounded-3xl shadow-2xl w-full max-w-sm p-7 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition disabled:opacity-50"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00A3C4] to-[#0284C7] flex items-center justify-center shadow-lg shadow-cyan-500/25 text-white">
            <Lock className="w-7 h-7" />
          </div>
        </div>

        <h3 className="text-lg font-black text-slate-900 dark:text-white text-center mb-1">
          Authorize Transfer
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">
          Enter your 6-digit transaction PIN to complete this payment
        </p>

        {/* 6 PIN Boxes */}
        <div className="flex justify-between items-center gap-2 mb-5">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className={`w-11 h-12 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all ${
                d
                  ? "border-[#00A3C4] bg-cyan-50/70 dark:bg-cyan-950/40 text-[#00A3C4] dark:text-cyan-300 ring-2 ring-cyan-100 dark:ring-cyan-900/50"
                  : error
                    ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 text-slate-800 dark:text-white"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
              } focus:border-[#00A3C4] focus:bg-cyan-50/70 dark:focus:bg-cyan-950/50 focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900/50`}
            />
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2 text-xs font-semibold border border-red-200 dark:border-red-800/60"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={pin.length < 6 || loading}
          className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#00A3C4] to-[#0284C7] hover:from-[#0891B2] hover:to-[#0369A1] shadow-md shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Verifying PIN &amp; Transferring...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" /> Confirm &amp; Transfer
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="w-full mt-2.5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Back to Review</span>
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 1 — Form Step                                                         */
/* -------------------------------------------------------------------------- */

interface FormStepProps {
  accounts: any[];
  accountsLoading: boolean;
  sourceAccount: string;
  setSourceAccount: (val: string) => void;
  destinationAccount: string;
  setDestinationAccount: (val: string) => void;
  recipientName: string;
  setRecipientName: (val: string) => void;
  lookupLoading: boolean;
  lookupError: string;
  amount: string;
  setAmount: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  validationError: string;
  recentAccounts: string[];
  beneficiaries: Beneficiary[];
  transferLimits: TransferLimitInfo | null;
  onContinue: () => void;
  onCancel?: () => void;
}

function FormStep({
  accounts,
  accountsLoading,
  sourceAccount,
  setSourceAccount,
  destinationAccount,
  setDestinationAccount,
  recipientName,
  setRecipientName,
  lookupLoading,
  lookupError,
  amount,
  setAmount,
  description,
  setDescription,
  validationError,
  recentAccounts,
  beneficiaries = [],
  transferLimits = null,
  onContinue,
  onCancel,
}: FormStepProps) {
  const [recipientTab, setRecipientTab] = useState<"beneficiaries" | "manual">(
    beneficiaries.length > 0 && !destinationAccount ? "beneficiaries" : "manual"
  );

  const selectedAcc = accounts.find((a) => a.accountNumber === sourceAccount);
  const quickAmounts = [10000, 50000, 100000, 500000];

  const cleanDest = destinationAccount?.trim();
  const isBeneficiary = Boolean(
    cleanDest &&
      beneficiaries.some(
        (b) => b.beneficiaryAccountNumber?.trim() === cleanDest
      )
  );
  const effectiveOneTimeLimit = transferLimits
    ? isBeneficiary
      ? transferLimits.effectiveOneTimeLimitBeneficiary
      : transferLimits.effectiveOneTimeLimitStranger
    : null;
  const amountNum = Number(amount) || 0;
  const totalCurrentBalance = selectedAcc ? Number(selectedAcc.currentBalance ?? selectedAcc.availableBalance) : 0;
  const minBalance = transferLimits?.minimumBalance ?? (selectedAcc ? Number(selectedAcc.minimumBalance || 10000) : 10000);
  // Net available to transfer: Current Balance - Minimum Reserve (or availableBalance if already adjusted)
  const netAvailable = selectedAcc
    ? (selectedAcc.availableBalance !== undefined && selectedAcc.availableBalance < totalCurrentBalance
        ? Number(selectedAcc.availableBalance)
        : Math.max(0, totalCurrentBalance - minBalance))
    : 0;

  const isOverOneTimeLimit = Boolean(
    transferLimits && effectiveOneTimeLimit && amountNum > effectiveOneTimeLimit
  );
  const isOverDailyLimit = Boolean(
    transferLimits && amountNum > transferLimits.remainingDailyLimit
  );
  const isInsufficientBalance = Boolean(
    selectedAcc && amountNum > netAvailable
  );
  const isAmountInvalid =
    !amount ||
    amountNum <= 0 ||
    isOverOneTimeLimit ||
    isOverDailyLimit ||
    isInsufficientBalance;

  const isFormInvalid = Boolean(
    accountsLoading ||
      lookupLoading ||
      !sourceAccount ||
      !cleanDest ||
      Boolean(lookupError) ||
      !recipientName ||
      isAmountInvalid ||
      sourceAccount === cleanDest
  );

  return (
    <div className="space-y-6">
      {/* 1. From Account Selector */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          From Account
        </label>
        {accountsLoading ? (
          <div className="flex items-center gap-2 py-3 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-500" /> Loading your accounts...
          </div>
        ) : (
          <div className="space-y-2">
            <select
              value={sourceAccount}
              onChange={(e) => setSourceAccount(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 dark:bg-[#0f2445] border border-slate-200 dark:border-slate-700/80 rounded-2xl text-sm font-extrabold text-slate-900 dark:text-white focus:border-[#00A3C4] focus:bg-white dark:focus:bg-[#0f2445] focus:ring-2 focus:ring-cyan-500/20 outline-none transition cursor-pointer shadow-xs"
            >
              {accounts.length === 0 && <option value="">No active accounts</option>}
              {accounts.map((acc) => (
                <option key={acc.accountNumber} value={acc.accountNumber} disabled={acc.status !== "ACTIVE"}>
                  {acc.accountNumber} — {acc.accountType} ({Number(acc.availableBalance).toLocaleString()} MMK)
                  {acc.status !== "ACTIVE" ? ` [${acc.status}]` : ""}
                </option>
              ))}
            </select>

            {selectedAcc && (
              <div className="px-4 py-3.5 bg-gradient-to-r from-cyan-50/90 via-sky-50/60 to-slate-50/70 dark:from-[#0a1f3d] dark:via-[#0c2447] dark:to-[#0f2a52] rounded-2xl border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-between shadow-xs dark:shadow-md dark:shadow-cyan-950/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-[#00A3C4] dark:text-cyan-300 shrink-0 shadow-xs">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#007B99] dark:text-cyan-300">
                      Available to Transfer
                    </p>
                    <p className="text-base sm:text-lg font-black text-[#0A192F] dark:text-white tracking-tight">
                      {netAvailable.toLocaleString()} MMK
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                      Total Balance: <span className="font-bold text-slate-800 dark:text-white">{totalCurrentBalance.toLocaleString()} MMK</span> • Min reserve: {minBalance.toLocaleString()} MMK
                    </p>
                  </div>
                </div>
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-[#007088] dark:text-cyan-300 border border-cyan-300/80 dark:border-cyan-400/40 shadow-xs">
                  {selectedAcc.accountType}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Recipient Selector (2-Tab Experience: Saved Contacts vs Direct Number) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Transfer To
          </label>
          {beneficiaries.length > 0 && (
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-[#0f2445] p-1 text-xs font-semibold border border-slate-200/70 dark:border-slate-700/80 shadow-xs">
              <button
                type="button"
                onClick={() => setRecipientTab("beneficiaries")}
                className={`px-3 py-1.5 rounded-lg transition font-bold ${
                  recipientTab === "beneficiaries"
                    ? "bg-white dark:bg-[#00A3C4] text-[#00A3C4] dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Saved Contacts ({beneficiaries.length})
              </button>
              <button
                type="button"
                onClick={() => setRecipientTab("manual")}
                className={`px-3 py-1.5 rounded-lg transition font-bold ${
                  recipientTab === "manual"
                    ? "bg-white dark:bg-[#00A3C4] text-[#00A3C4] dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Enter Account No
              </button>
            </div>
          )}
        </div>

        {/* Tab A: Saved Contacts (Beneficiaries Grid / Chips) */}
        {recipientTab === "beneficiaries" && beneficiaries.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {beneficiaries.map((b) => {
              const isSelected = destinationAccount === b.beneficiaryAccountNumber;
              const initial = (b.nickname || b.beneficiaryAccountName || "B")[0].toUpperCase();
              return (
                <button
                  key={b.beneficiaryId}
                  type="button"
                  onClick={() => {
                    const accNo = b.beneficiaryAccountNumber?.trim() || "";
                    setDestinationAccount(accNo);
                    if (b.nickname || b.beneficiaryAccountName) {
                      setRecipientName(b.nickname || b.beneficiaryAccountName);
                    }
                  }}
                  className={`p-2.5 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                    isSelected
                      ? "border-[#00A3C4] bg-cyan-50/70 shadow-sm ring-2 ring-cyan-100"
                      : "border-slate-200 bg-slate-50/60 hover:bg-white hover:border-cyan-300"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected ? "bg-[#00A3C4] text-white" : "bg-cyan-100 text-[#00A3C4]"
                    }`}
                  >
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {b.nickname || b.beneficiaryAccountName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      {b.beneficiaryAccountNumber}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Account Number Input */}
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            list="recent-destinations"
            value={destinationAccount}
            onChange={(e) => setDestinationAccount(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 10 to 16 digit recipient account number"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-[#00A3C4] focus:bg-white focus:ring-2 focus:ring-cyan-100 outline-none transition"
            maxLength={34}
            required
          />
          <datalist id="recent-destinations">
            {recentAccounts.map((acc, i) => (
              <option key={i} value={acc} />
            ))}
          </datalist>
        </div>

        {/* Recipient Verification Status Badge */}
        {lookupLoading && (
          <div className="flex items-center gap-2 mt-2 px-3.5 py-2 bg-cyan-50/80 border border-cyan-100 rounded-xl text-xs text-[#00A3C4] font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500" />
            <span>Verifying recipient account with Core Banking...</span>
          </div>
        )}

        {!lookupLoading && recipientName && (
          <div className="mt-2 space-y-1.5">
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-medium text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Recipient: <strong className="font-bold text-sm text-emerald-950">{recipientName}</strong>
                </span>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Verified Account
              </span>
            </div>

            {/* Anti-Scam / Limit Classification Badge */}
            {transferLimits && (
              <div
                className={`px-3 py-1.5 rounded-xl border text-[11px] flex items-center justify-between transition-all ${
                  isBeneficiary
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
                    : "bg-amber-50/80 border-amber-200 text-amber-800"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {isBeneficiary ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  )}
                  <span>
                    {isBeneficiary ? (
                      <strong>Saved Beneficiary</strong>
                    ) : (
                      <strong>New / Unsaved Account</strong>
                    )}
                  </span>
                </div>
                <span className="font-semibold text-[10px]">
                  Max One-Time: {effectiveOneTimeLimit?.toLocaleString()} MMK
                </span>
              </div>
            )}
          </div>
        )}

        {lookupError && !lookupLoading && (
          <div className="flex items-center gap-1.5 mt-2 px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}
      </div>

      {/* 3. Amount Input with Comma Formatting and Quick Pills */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Transfer Amount
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={amount ? Number(amount).toLocaleString("en-US") : ""}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              setAmount(raw);
            }}
            placeholder="0.00"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-slate-900 placeholder-slate-300 focus:border-[#00A3C4] focus:bg-white focus:ring-2 focus:ring-cyan-100 outline-none transition"
            required
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
            MMK
          </div>
        </div>

        {/* Quick Amount Chips */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
          {quickAmounts.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(String(q))}
              className="px-2.5 py-1 bg-slate-100 hover:bg-cyan-50 hover:text-[#00A3C4] hover:border-cyan-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition shrink-0"
            >
              +{q.toLocaleString()}
            </button>
          ))}
          {selectedAcc && (
            <button
              type="button"
              onClick={() => setAmount(String(Math.floor(netAvailable)))}
              className="px-2.5 py-1 bg-cyan-50/70 text-[#00A3C4] border border-cyan-200 rounded-xl text-xs font-black transition shrink-0"
            >
              Max
            </button>
          )}
        </div>

        {/* Real-time Amount Limit Warnings & Guidance */}
        {amountNum > 0 && (isOverOneTimeLimit || isOverDailyLimit || isInsufficientBalance) && (
          <div className="mt-3 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs space-y-2 transition-all">
            {isOverOneTimeLimit && (
              <div>
                <div className="flex items-center gap-1.5 font-bold text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>
                    Transfer amount of {amountNum.toLocaleString()} MMK exceeds {isBeneficiary ? "beneficiary" : "stranger"} limit of {effectiveOneTimeLimit?.toLocaleString()} MMK.
                  </span>
                </div>
                {!isBeneficiary && transferLimits && (
                  <p className="text-[11px] text-slate-600 pl-5.5 leading-relaxed mt-1">
                    💡 <strong>Tip:</strong> Add this account to beneficiaries to transfer up to{" "}
                    <span className="font-bold text-slate-800">
                      {transferLimits.effectiveOneTimeLimitBeneficiary.toLocaleString()} MMK
                    </span>.
                  </p>
                )}
              </div>
            )}

            {isOverDailyLimit && (
              <div className="flex items-start gap-1.5 font-bold text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <p>
                    Transfer exceeds your remaining daily limit of {transferLimits?.remainingDailyLimit.toLocaleString()} MMK.
                  </p>
                  <p className="text-[11px] font-normal text-slate-600 mt-0.5">
                    Transferred today: {transferLimits?.todayTransferredAmount.toLocaleString()} MMK
                  </p>
                </div>
              </div>
            )}

            {isInsufficientBalance && (
              <div className="flex items-start gap-1.5 font-bold text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <p>
                    Insufficient balance. You must maintain a minimum reserve balance of {minBalance.toLocaleString()} MMK.
                  </p>
                  <p className="text-[11px] font-normal text-slate-600 mt-0.5">
                    Net available to transfer: {netAvailable.toLocaleString()} MMK (Total Balance: {totalCurrentBalance.toLocaleString()} MMK)
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Description / Note (Optional) */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Note / Payment Purpose (Optional)
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Project payment, rent, dinner split"
          maxLength={100}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-[#00A3C4] focus:bg-white focus:ring-2 focus:ring-cyan-100 outline-none transition"
        />
      </div>

      {/* General Validation Error (suppressed when already shown inline in Amount) */}
      {validationError && !isOverOneTimeLimit && !isOverDailyLimit && !isInsufficientBalance && (
        <div className="p-3.5 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 rounded-2xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition flex items-center justify-center gap-1.5"
          >
            <span>Cancel</span>
          </button>
        )}

        <button
          type="button"
          onClick={onContinue}
          disabled={isFormInvalid}
          className={`${onCancel ? "flex-[2]" : "w-full"} py-4 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 ${
            isFormInvalid
              ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
              : "text-white bg-gradient-to-r from-[#00A3C4] to-[#0284C7] hover:from-[#0891B2] hover:to-[#0369A1] shadow-md shadow-cyan-500/25 cursor-pointer"
          }`}
        >
          <span>Proceed to Review</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 2 — Review & Confirmation Step                                        */
/* -------------------------------------------------------------------------- */

interface ReviewStepProps {
  sourceAccount: string;
  destinationAccount: string;
  recipientName: string;
  amount: number;
  description: string;
  onConfirm: () => void;
  onBack: () => void;
}

function ReviewStep({
  sourceAccount,
  destinationAccount,
  recipientName,
  amount,
  description,
  onConfirm,
  onBack,
}: ReviewStepProps) {
  return (
    <div className="space-y-6">
      {/* Hero Confirmation Card */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A192F] overflow-hidden shadow-sm">
        {/* 1. Review Transfer Amount Header Banner */}
        <div className="bg-gradient-to-b from-cyan-50/90 to-cyan-50/40 dark:from-[#0f2445] dark:to-[#0A192F] border-b border-cyan-100 dark:border-slate-800 py-6 px-6 sm:py-7 sm:px-7 text-center">
          <p className="text-xs uppercase font-extrabold text-[#00A3C4] dark:text-cyan-400 tracking-wider mb-2">
            Review Transfer Amount
          </p>
          <div className="inline-flex items-baseline justify-center gap-2">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-[#0A192F] dark:text-white">
              {amount.toLocaleString()}
            </span>
            <span className="text-base sm:text-lg font-black text-[#00A3C4] dark:text-cyan-400">
              MMK
            </span>
          </div>
        </div>

        {/* 2. Transfer Pathway (Sender Box ➔ Recipient Box) */}
        <div className="p-5 sm:p-6 bg-slate-50/70 dark:bg-[#0f2445]/40 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            {/* Sender Box Card */}
            <div className="flex-1 bg-white dark:bg-[#0A192F] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-400 tracking-wider block">
                From (Sender)
              </span>
              <p className="text-sm font-mono font-black text-slate-900 dark:text-white truncate">
                {sourceAccount}
              </p>
              <span className="inline-block text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                Primary Account
              </span>
            </div>

            {/* Central Prominent Arrow Connector */}
            <div className="flex items-center justify-center shrink-0 my-0.5 sm:my-0">
              <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-[#00A3C4] dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center shadow-xs">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>

            {/* Recipient Box Card */}
            <div className="flex-1 bg-white dark:bg-[#0A192F] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-400 tracking-wider block">
                To (Recipient)
              </span>
              <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                {recipientName || "Verified Account"}
              </p>
              <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 truncate">
                {destinationAccount}
              </p>
            </div>
          </div>
        </div>

        {/* 3. Breakdown List with Enhanced Visual Hierarchy */}
        <div className="p-5 sm:p-6 divide-y divide-slate-100 dark:divide-slate-800/80 text-xs sm:text-[13px]">
          <div className="flex justify-between items-center py-2.5">
            <span className="text-slate-700 dark:text-slate-300 font-semibold">Payment Channel</span>
            <span className="font-bold text-slate-900 dark:text-white tracking-wide">EKARAJ BANK</span>
          </div>

          <div className="flex justify-between items-center py-2.5">
            <span className="text-slate-700 dark:text-slate-300 font-semibold">Service Fee</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">0.00 MMK (Free)</span>
          </div>

          {description && (
            <div className="flex justify-between items-center py-2.5">
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Transfer Memo</span>
              <span className="font-semibold text-slate-900 dark:text-white italic">"{description}"</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 mt-1 border-t border-slate-200 dark:border-slate-800">
            <span className="text-sm sm:text-base font-extrabold text-[#0A192F] dark:text-white">
              Total Debited Amount
            </span>
            <span className="font-black text-[#00A3C4] dark:text-cyan-400 text-lg sm:text-xl tracking-tight">
              {amount.toLocaleString()} MMK
            </span>
          </div>
        </div>
      </div>

      {/* Security Assurance Notice */}
      <div className="p-3.5 bg-cyan-50/70/60 border border-cyan-100 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900">
        <Lock className="w-4 h-4 text-[#00A3C4] shrink-0 mt-0.5" />
        <p>
          This transaction is authenticated with 2-Factor Transaction PIN. Funds will be deposited instantly.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition flex items-center justify-center gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={onConfirm}
          className="flex-[2] py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-[#00A3C4] to-[#0284C7] hover:from-[#0891B2] hover:to-[#0369A1] shadow-md shadow-cyan-500/25 transition flex items-center justify-center gap-2"
        >
          <Lock className="w-4 h-4" />
          <span>Authorize &amp; Enter PIN</span>
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 3 — Real-World Official E-Receipt                                     */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Social & Chat Icons for Receipt Sharing                                    */
/* -------------------------------------------------------------------------- */

const TelegramIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
  </svg>
);

const ViberIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19.78 14.54c-.5-.33-1.03-.61-1.58-.84-.53-.22-1.11-.27-1.63-.07-.36.14-.68.39-.96.68l-.57.57c-.23.23-.55.33-.86.23-.9-.29-2.27-1.1-3.26-2.09-.99-.99-1.8-2.36-2.09-3.26-.1-.31 0-.63.23-.86l.57-.57c.29-.28.54-.6.68-.96.2-.52.15-1.1-.07-1.63-.23-.55-.51-1.08-.84-1.58-.45-.67-1.14-1.07-1.94-1.11-.8-.04-1.57.28-2.11.87l-.46.5c-.75.82-1.12 1.91-1.02 3 .27 2.8 1.92 6.09 4.38 8.55 2.46 2.46 5.75 4.11 8.55 4.38 1.09.1 2.18-.27 3-1.02l.5-.46c.59-.54.91-1.31.87-2.11-.04-.8-.44-1.49-1.11-1.94m-5.08-10.7c3.48.33 6.22 3.07 6.55 6.55m-6.55-4.14c1.98.27 3.54 1.83 3.81 3.81" />
  </svg>
);

const MessengerIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.518 3.735 7.185V22l3.415-1.874c.905.25 1.865.385 2.85.385 5.523 0 10-4.145 10-9.253C22 6.145 17.523 2 12 2zm1.06 12.38l-2.695-2.875-5.258 2.875 5.786-6.142 2.76 2.875 5.193-2.875-5.786 6.142z" />
  </svg>
);

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  const userAgent = navigator.userAgent || "";
  // Strictly detect mobile OS (iOS or Android)
  // NEVER treat Windows desktop or Mac desktop as mobile!
  const isMobileOS = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  const isDesktopOS = /Windows NT|Macintosh|Linux x86_64/i.test(userAgent);
  return isMobileOS && !isDesktopOS;
};

const copyImageToClipboard = async (blob: Blob): Promise<boolean> => {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      const item = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (err) {
    console.warn("Failed to copy image to clipboard:", err);
  }
  return false;
};

interface ReceiptStepProps {
  result: any;
  recipientName?: string;
  onNewTransfer: () => void;
  onGoDashboard: () => void;
  isSavedBeneficiary: boolean;
  onSaveBeneficiary: () => Promise<void>;
  savingBeneficiary: boolean;
  beneficiarySaved: boolean;
}

function ReceiptStep({
  result,
  recipientName,
  onNewTransfer,
  onGoDashboard,
  isSavedBeneficiary,
  onSaveBeneficiary,
  savingBeneficiary,
  beneficiarySaved,
}: ReceiptStepProps) {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImageBlob, setShareImageBlob] = useState<Blob | null>(null);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [imageCopied, setImageCopied] = useState(false);

  const receiptData = React.useMemo(
    () => mapP2PResponseToReceiptData(result, recipientName),
    [result, recipientName]
  );

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "";
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.transactionRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard write failures gracefully
    }
  };

  const getReceiptBlob = async (element: HTMLElement): Promise<Blob> => {
    const blob = await toBlob(element, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      filter: (node: Node) => {
        if (node instanceof HTMLElement && node.classList.contains("no-print")) {
          return false;
        }
        return true;
      },
    });
    if (!blob) throw new Error("Failed to generate image blob");
    return blob;
  };

  // =========================================================================
  // Production URL Share Link (Preserved for future hosting deployment)
  // When the production domain is live, you can re-enable the link sharing:
  // const productionDomain = "https://ekarajbank.com";
  // const shareReceiptUrl = `${productionDomain}/receipt/${result.transactionRef}`;
  // const shareSummaryText = `EKARAJ BANK Official Transfer Receipt\nRef: ${result.transactionRef}\nAmount: ${Number(result.amount).toLocaleString()} ${result.currency || "MMK"}\nVerify: ${shareReceiptUrl}`;
  // =========================================================================

  const handleShareToTelegram = async () => {
    if (shareImageBlob) {
      const ok = await copyImageToClipboard(shareImageBlob);
      if (ok) setImageCopied(true);
    }
    // Directly open Telegram Web to chats without intermediate link tab or forward dialog
    window.open("https://web.telegram.org", "_blank", "noopener,noreferrer");
  };

  const handleShareToViber = async () => {
    if (shareImageBlob) {
      const ok = await copyImageToClipboard(shareImageBlob);
      if (ok) setImageCopied(true);
    }
    // Launch Viber Desktop directly without forward popup
    try {
      window.location.href = "viber://";
    } catch {
      window.open("https://www.viber.com", "_blank", "noopener,noreferrer");
    }
  };

  const handleShareToMessenger = async () => {
    if (shareImageBlob) {
      const ok = await copyImageToClipboard(shareImageBlob);
      if (ok) setImageCopied(true);
    }
    // Directly open Messenger to chats
    window.open("https://www.messenger.com", "_blank", "noopener,noreferrer");
  };

  const handleShareToWhatsApp = async () => {
    if (shareImageBlob) {
      const ok = await copyImageToClipboard(shareImageBlob);
      if (ok) setImageCopied(true);
    }
    // Directly open WhatsApp Web to chats
    window.open("https://web.whatsapp.com", "_blank", "noopener,noreferrer");
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      const receiptElement =
        (document.getElementById("receipt-capture-area") as HTMLElement) ||
        (document.querySelector(".print-receipt-container") as HTMLElement);

      if (!receiptElement) {
        throw new Error("Receipt element not found");
      }

      const blob = await getReceiptBlob(receiptElement);
      const filename = `ekaraj-receipt-${result.transactionRef || Date.now()}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      // Mobile Flow: If on mobile, invoke native OS Share sheet with file
      if (
        isMobileDevice() &&
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: "EKARAJ BANK Transfer Receipt",
            text: `Official EKARAJ BANK Transfer Receipt\nRef: ${result.transactionRef}\nAmount: ${Number(result.amount).toLocaleString()} ${result.currency || "MMK"}`,
          });
          return;
        } catch (shareErr: unknown) {
          if ((shareErr as Error)?.name === "AbortError") {
            return;
          }
        }
      }

      // Desktop Flow: Automatically copy image to system clipboard
      const copiedOk = await copyImageToClipboard(blob);
      setImageCopied(copiedOk);

      if (shareImageUrl) {
        URL.revokeObjectURL(shareImageUrl);
      }
      setShareImageBlob(blob);
      setShareImageUrl(URL.createObjectURL(blob));
      setShowShareModal(true);
    } catch (err) {
      console.error("Failed to share receipt image:", err);
      // Fallback text share if canvas completely failed
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: "EKARAJ BANK Transfer Receipt",
            text: `EKARAJ BANK Transfer Receipt\nRef: ${result.transactionRef}\nAmount: ${Number(result.amount).toLocaleString()} ${result.currency || "MMK"}`,
          });
        } catch {
          // User cancelled
        }
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <TransferReceiptView
        data={receiptData}
        showQr={true}
        actions={
          <>
            {/* Quick Add to Beneficiary */}
            {!isSavedBeneficiary && (
              <button
                type="button"
                onClick={onSaveBeneficiary}
                disabled={savingBeneficiary}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs font-bold text-amber-800 hover:bg-amber-100 transition disabled:opacity-60"
              >
                {savingBeneficiary ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    <span>Saving to Beneficiaries...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 text-amber-600" />
                    <span>Add {recipientName || "Recipient"} to Saved Contacts</span>
                  </>
                )}
              </button>
            )}

            {beneficiarySaved && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Added to Beneficiaries successfully!</span>
              </div>
            )}

            {/* Row of 3 Action Buttons: [ Share Receipt ] [ Download PDF ] [ Copy Ref ] */}
            <div className="grid grid-cols-3 gap-2">
              {/* 1. Share Receipt */}
              <button
                type="button"
                onClick={handleShare}
                disabled={isSharing}
                className="flex items-center justify-center gap-1.5 py-2.5 px-1.5 sm:px-2 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-xs text-slate-700 transition shadow-2xs disabled:opacity-75 disabled:cursor-wait cursor-pointer"
              >
                {isSharing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00A3C4] shrink-0" />
                    <span className="truncate">Sharing...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-[#00A3C4] shrink-0" />
                    <span className="truncate">Share Receipt</span>
                  </>
                )}
              </button>

              {/* 2. Download PDF */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center justify-center gap-1.5 py-2.5 px-1.5 sm:px-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-xs text-slate-700 transition shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">Download PDF</span>
              </button>

              {/* 3. Copy Ref */}
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center justify-center gap-1.5 py-2.5 px-1.5 sm:px-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-xs text-slate-700 transition shadow-2xs cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-emerald-700 truncate">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">Copy Ref</span>
                  </>
                )}
              </button>
            </div>

            {/* Make Another Transfer */}
            <button
              type="button"
              onClick={onNewTransfer}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-[#00A3C4] to-[#0284C7] hover:from-[#0891B2] hover:to-[#0369A1] shadow-md shadow-cyan-500/25 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Make Another Transfer</span>
            </button>

            {/* Return to Dashboard */}
            <button
              type="button"
              onClick={onGoDashboard}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return to Dashboard</span>
            </button>
          </>
        }
      />

      {/* Interactive Desktop Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setShowShareModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-5 text-slate-800 animate-in zoom-in-95 border border-slate-100 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-[#00A3C4] flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Share Transfer Receipt
                  </h3>
                  <p className="text-[10px] font-medium text-slate-400">
                    EKARAJ BANK Official Slip
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Preview Thumbnail */}
            {shareImageUrl && (
              <div className="mb-3 p-1.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-center overflow-hidden">
                <img
                  src={shareImageUrl}
                  alt="Receipt Preview"
                  className="max-h-40 w-auto object-contain rounded-xl shadow-2xs"
                />
              </div>
            )}

            {/* Status / Feedback Banner */}
            {imageCopied && (
              <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Receipt image copied to clipboard! Press <strong>Ctrl + V</strong> in your chat to paste.
                </span>
              </div>
            )}

            {/* Quick Actions (Full-width Copy Image Button) */}
            <div className="mb-3">
              <button
                type="button"
                onClick={async () => {
                  if (shareImageBlob) {
                    const ok = await copyImageToClipboard(shareImageBlob);
                    setImageCopied(ok);
                  }
                }}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs transition duration-200 shadow-sm cursor-pointer ${
                  imageCopied
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                    : "bg-[#00A3C4] hover:bg-[#0891B2] text-white shadow-cyan-500/20"
                }`}
              >
                {imageCopied ? (
                  <>
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Receipt Image Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 shrink-0" />
                    <span>Copy Receipt Image</span>
                  </>
                )}
              </button>
            </div>

            {/* Social / Chat Share Apps */}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                Open Chat App to Paste
              </p>

              <div className="grid grid-cols-4 gap-2">
                {/* Telegram */}
                <button
                  type="button"
                  onClick={handleShareToTelegram}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl border border-slate-200 hover:border-[#229ED9] hover:bg-[#229ED9]/5 transition group cursor-pointer"
                  title="Open Telegram Web (Receipt image copied — press Ctrl+V to paste)"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#229ED9]/10 text-[#229ED9] flex items-center justify-center group-hover:scale-110 transition">
                    <TelegramIcon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 mt-1">
                    Telegram
                  </span>
                </button>

                {/* Viber */}
                <button
                  type="button"
                  onClick={handleShareToViber}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl border border-slate-200 hover:border-[#7360F2] hover:bg-[#7360F2]/5 transition group cursor-pointer"
                  title="Open Viber App (Receipt image copied — press Ctrl+V to paste)"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#7360F2]/10 text-[#7360F2] flex items-center justify-center group-hover:scale-110 transition">
                    <ViberIcon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 mt-1">
                    Viber
                  </span>
                </button>

                {/* Messenger */}
                <button
                  type="button"
                  onClick={handleShareToMessenger}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl border border-slate-200 hover:border-[#0084FF] hover:bg-[#0084FF]/5 transition group cursor-pointer"
                  title="Open Messenger (Receipt image copied — press Ctrl+V to paste)"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#0084FF]/10 text-[#0084FF] flex items-center justify-center group-hover:scale-110 transition">
                    <MessengerIcon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 mt-1">
                    Messenger
                  </span>
                </button>

                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={handleShareToWhatsApp}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl border border-slate-200 hover:border-[#25D366] hover:bg-[#25D366]/5 transition group cursor-pointer"
                  title="Open WhatsApp Web (Receipt image copied — press Ctrl+V to paste)"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center group-hover:scale-110 transition">
                    <WhatsAppIcon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 mt-1">
                    WhatsApp
                  </span>
                </button>
              </div>
            </div>

            {/* Helpful Instruction Tip */}
            <div className="mt-3 p-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-500 leading-normal text-center">
              💡 <strong>Tip:</strong> Receipt image is automatically copied. Open any chat app above, then press <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-slate-700">Ctrl + V</kbd> to paste.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Main P2P Transfer Component with 2-Column Responsive Layout                */
/* -------------------------------------------------------------------------- */

type Step = "form" | "review" | "receipt" | "failed";

export const P2PTransferForm = () => {
  const dispatch = useAppDispatch();
  const { loading, error, success, transactionResult } = useAppSelector((s) => s.transfer);
  const { accounts, loading: accountsLoading } = useAppSelector((s) => s.accounts);
  const { profile } = useAppSelector((s) => s.profile);
  const currentCustomerId = profile?.customerCode || getCurrentCustomerSubject();

  const [step, setStep] = useState<Step>("form");
  const [showPinModal, setShowPinModal] = useState(false);
  const [failureData, setFailureData] = useState<{
    reason: string;
    code?: string;
    referenceId?: string;
  } | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const [sourceAccount, setSourceAccount] = useState("");
  const [destinationAccount, setDestinationAccount] = useState<string>(
    () => (location.state as any)?.destinationAccount || ""
  );
  const [recipientName, setRecipientName] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState("");
  const [recentAccounts, setRecentAccounts] = useState<string[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [savingBeneficiary, setSavingBeneficiary] = useState(false);
  const [beneficiarySaved, setBeneficiarySaved] = useState(false);
  const [transferLimits, setTransferLimits] = useState<TransferLimitInfo | null>(null);

  // Function to load and sync beneficiaries
  const loadBeneficiaries = () => {
    getBeneficiaries()
      .then((data) => {
        if (Array.isArray(data)) {
          setBeneficiaries(data);
        }
      })
      .catch(() => {});
  };

  // Load transfer limits and sync beneficiaries when sourceAccount changes
  useEffect(() => {
    if (sourceAccount) {
      getAccountTransferLimits(sourceAccount)
        .then(setTransferLimits)
        .catch(() => setTransferLimits(null));
      loadBeneficiaries();
    } else {
      setTransferLimits(null);
    }
  }, [sourceAccount]);

  // Load beneficiaries on mount and window focus (auto-sync if added in another tab/page)
  useEffect(() => {
    loadBeneficiaries();
    const handleFocus = () => loadBeneficiaries();
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Update destination account and sync beneficiaries if navigated with router state
  useEffect(() => {
    const dest = (location.state as any)?.destinationAccount;
    if (dest) {
      setDestinationAccount(dest);
      loadBeneficiaries();
    }
  }, [location.state]);

  // Clear bottom validation error as user modifies form inputs
  useEffect(() => {
    if (validationError) {
      setValidationError("");
    }
  }, [amount, destinationAccount, sourceAccount]);

  const isSavedBeneficiary = Boolean(
    beneficiarySaved ||
      (transactionResult &&
        beneficiaries.some(
          (b) =>
            b.beneficiaryAccountNumber?.trim() ===
            transactionResult.destinationAccountNumber?.trim()
        ))
  );

  const handleSaveBeneficiary = async () => {
    if (!transactionResult) return;
    try {
      setSavingBeneficiary(true);
      const created = await addBeneficiary({
        beneficiaryAccountNumber: transactionResult.destinationAccountNumber,
        nickname: recipientName || undefined,
      });
      setBeneficiaries((prev) => [created, ...prev]);
      setBeneficiarySaved(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingBeneficiary(false);
    }
  };

  // Auto-select first active account
  useEffect(() => {
    if (accounts.length > 0 && !sourceAccount) {
      const firstActive = accounts.find((a) => a.status === "ACTIVE") ?? accounts[0];
      setSourceAccount(firstActive.accountNumber);
    }
  }, [accounts, sourceAccount]);

  // Load recent accounts & reset transfer state
  useEffect(() => {
    dispatch(fetchMyAccounts());
    const storageKey = currentCustomerId ? `recentDestinations_${currentCustomerId}` : "recentDestinations";
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setRecentAccounts(JSON.parse(saved));
      } catch {
        setRecentAccounts([]);
      }
    } else {
      setRecentAccounts([]);
    }

    // Clean up legacy global key if user-scoped key is active
    if (currentCustomerId) {
      localStorage.removeItem("recentDestinations");
    }

    return () => {
      dispatch(resetTransferState());
    };
  }, [dispatch, currentCustomerId]);

  // Debounced recipient account lookup
  useEffect(() => {
    const acc = destinationAccount.trim();
    if (!acc || acc.length < 5) {
      setRecipientName("");
      setLookupError("");
      return;
    }

    // Check if it matches a known saved beneficiary immediately to prevent flicker
    const matchedBeneficiary = beneficiaries.find(
      (b) => b.beneficiaryAccountNumber?.trim() === acc
    );
    if (matchedBeneficiary) {
      setRecipientName(
        matchedBeneficiary.nickname ||
        matchedBeneficiary.beneficiaryAccountName ||
        ""
      );
      setLookupError("");
    } else {
      setRecipientName("");
      setLookupError("");
    }

    const timer = setTimeout(async () => {
      try {
        setLookupLoading(true);
        setLookupError("");
        const res = await lookupDestinationAccount(acc);
        if (res && res.accountName) {
          setRecipientName(res.accountName);
        } else {
          setLookupError("Account not found");
        }
      } catch (err: any) {
        if (!err.response) {
          setLookupError("Cannot connect to server. Please ensure backend is running.");
        } else if (err.response.status === 401) {
          setLookupError("Session expired. Please log in again.");
        } else {
          setLookupError(err.response?.data?.message || "Account not found or inactive.");
          if (!matchedBeneficiary) {
            setRecipientName("");
          }
        }
      } finally {
        setLookupLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [destinationAccount, beneficiaries]);

  // Step transition on success
  useEffect(() => {
    if (success && transactionResult) {
      setShowPinModal(false);
      setStep("receipt");
    }
  }, [success, transactionResult]);

  const saveDestination = (accNo: string) => {
    const updated = [accNo, ...recentAccounts.filter((a) => a !== accNo)].slice(0, 5);
    setRecentAccounts(updated);
    const storageKey = currentCustomerId ? `recentDestinations_${currentCustomerId}` : "recentDestinations";
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  /* Validation */
  const handleContinue = () => {
    setValidationError("");
    if (!sourceAccount) return setValidationError("Please select a source account.");
    if (!destinationAccount.trim()) return setValidationError("Please enter a destination account number.");
    if (!/^\d+$/.test(destinationAccount)) return setValidationError("Destination account number must contain only numbers.");
    if (sourceAccount === destinationAccount) return setValidationError("Source and destination accounts cannot be the same.");
    if (lookupLoading) return setValidationError("Verifying destination account, please wait...");
    if (lookupError) return setValidationError(lookupError);
    if (!recipientName) return setValidationError("Please enter a valid destination account number.");
    if (!amount || Number(amount) < 1) return setValidationError("Minimum transfer amount is 1 MMK.");

    const transferNum = Number(amount);
    const selected = accounts.find((a) => a.accountNumber === sourceAccount);
    const currentBal = selected ? Number(selected.currentBalance ?? selected.availableBalance) : 0;
    const minReserve = transferLimits?.minimumBalance ?? (selected ? Number(selected.minimumBalance || 10000) : 10000);
    const maxTransferable = selected
      ? (selected.availableBalance !== undefined && selected.availableBalance < currentBal
          ? Number(selected.availableBalance)
          : Math.max(0, currentBal - minReserve))
      : 0;
    if (selected && transferNum > maxTransferable) {
      return setValidationError(
        `Insufficient available funds. You must maintain a minimum balance of ${minReserve.toLocaleString()} MMK. Net available for transfer is ${maxTransferable.toLocaleString()} MMK.`
      );
    }
    if (transferLimits) {
      const isBeneficiary = beneficiaries.some(
        (b) => b.beneficiaryAccountNumber === destinationAccount
      );
      const effectiveOneTime = isBeneficiary
        ? transferLimits.effectiveOneTimeLimitBeneficiary
        : transferLimits.effectiveOneTimeLimitStranger;

      if (transferNum > effectiveOneTime) {
        if (!isBeneficiary) {
          return setValidationError(
            `Transfer amount of ${transferNum.toLocaleString()} MMK exceeds stranger one-time limit of ${effectiveOneTime.toLocaleString()} MMK. Add this account to beneficiaries to transfer up to ${transferLimits.effectiveOneTimeLimitBeneficiary.toLocaleString()} MMK.`
          );
        } else {
          return setValidationError(
            `Transfer amount of ${transferNum.toLocaleString()} MMK exceeds your one-time transfer limit of ${effectiveOneTime.toLocaleString()} MMK.`
          );
        }
      }

      if (transferNum > transferLimits.remainingDailyLimit) {
        return setValidationError(
          `Transfer exceeds your remaining daily limit of ${transferLimits.remainingDailyLimit.toLocaleString()} MMK. Transferred today: ${transferLimits.todayTransferredAmount.toLocaleString()} MMK.`
        );
      }
    }

    setStep("review");
  };

  /* Real-world Automated API Transfer Submission Handler */
  const handleTransferSubmit = async (pin: string) => {
    const payload: P2PTransferRequest = {
      sourceAccountNumber: sourceAccount,
      destinationAccountNumber: destinationAccount,
      amount: Number(amount),
      currency: "MMK",
      transactionPin: pin,
      description: description || undefined,
      idempotencyKey: crypto.randomUUID(),
    };

    try {
      // 1. Submit to Real Banking API
      const resultAction = await dispatch(submitP2PTransfer(payload));

      // 2. HTTP Status 200 / 201: Success Flow
      if (submitP2PTransfer.fulfilled.match(resultAction)) {
        saveDestination(destinationAccount);
        dispatch(fetchMyAccounts());
        window.dispatchEvent(new Event("new-notification-event"));
        setShowPinModal(false);
        setStep("receipt");
        return;
      }

      // 3. HTTP Error Evaluation (Status 400, 401, 503, 504, 500)
      const errorPayload = resultAction.payload as any;
      const statusCode = Number(errorPayload?.status) || 500;
      const errorMsg =
        (typeof errorPayload === "string" ? errorPayload : errorPayload?.message) ||
        resultAction.error?.message ||
        "Transfer could not be processed. Please try again.";
      const errorCode = errorPayload?.code;

      // Status 401 or Invalid PIN error: Keep PIN modal open so user can re-try entering the PIN
      const isPinError =
        statusCode === 401 ||
        errorMsg.toLowerCase().includes("invalid pin") ||
        errorMsg.toLowerCase().includes("incorrect pin") ||
        errorCode === "INVALID_PIN";

      if (isPinError) {
        return;
      }

      // Status 400: Client Error (Insufficient Funds, Limit Exceeded, Invalid Account)
      if (statusCode === 400) {
        setShowPinModal(false);
        setFailureData({
          reason: errorMsg,
          code: errorCode || "ERR_CLIENT_VALIDATION",
          referenceId: `FAIL-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        });
        setStep("failed");
        return;
      }

      // Status 503 / 504: Server Offline or Network Timeout
      if (statusCode === 503 || statusCode === 504) {
        setShowPinModal(false);
        setFailureData({
          reason:
            statusCode === 503
              ? "System Offline: Core banking services are undergoing maintenance. Please try again later."
              : "Network Timeout: The banking payment gateway timed out. No funds were debited.",
          code: statusCode === 503 ? "ERR_SYSTEM_OFFLINE" : "ERR_NETWORK_TIMEOUT",
          referenceId: `FAIL-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        });
        setStep("failed");
        return;
      }

      // Other Server Errors (500 or fallback)
      setShowPinModal(false);
      setFailureData({
        reason: errorMsg,
        code: errorCode || `ERR_HTTP_${statusCode}`,
        referenceId: `FAIL-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      });
      setStep("failed");

    } catch (err: any) {
      // Network Disconnection or unhandled exception
      setShowPinModal(false);
      setFailureData({
        reason: "Network Timeout: Unable to connect to bank servers. Please check your internet connection.",
        code: "ERR_NETWORK_DISCONNECTED",
        referenceId: `FAIL-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      });
      setStep("failed");
    }
  };

  /* Reset */
  const handleReset = () => {
    setStep("form");
    setDestinationAccount("");
    setRecipientName("");
    setLookupError("");
    setAmount("");
    setDescription("");
    setValidationError("");
    setShowPinModal(false);
    setBeneficiarySaved(false);
    setFailureData(null);
    dispatch(resetTransferState());
    dispatch(fetchMyAccounts());
  };

  /* Cancel / Clear Form */
  const handleCancelForm = () => {
    if (destinationAccount || amount || description || validationError) {
      setDestinationAccount("");
      setRecipientName("");
      setLookupError("");
      setAmount("");
      setDescription("");
      setValidationError("");
      dispatch(clearTransferError());
    } else {
      navigate(-1);
    }
  };

  const selectedAcc = accounts.find((a) => a.accountNumber === sourceAccount);
  const currentBalance = selectedAcc ? Number(selectedAcc.currentBalance ?? selectedAcc.availableBalance) : 0;
  const minBalance = transferLimits?.minimumBalance ?? (selectedAcc ? Number(selectedAcc.minimumBalance || 10000) : 10000);
  const availBalance = selectedAcc
    ? (selectedAcc.availableBalance !== undefined && selectedAcc.availableBalance < currentBalance
        ? Number(selectedAcc.availableBalance)
        : Math.max(0, currentBalance - minBalance))
    : 0;
  const transferAmountNum = Number(amount) || 0;
  const newBalancePreview = Math.max(0, availBalance - transferAmountNum);

  const isBeneficiarySelected = Boolean(
    destinationAccount?.trim() &&
      beneficiaries.some(
        (b) => b.beneficiaryAccountNumber?.trim() === destinationAccount.trim()
      )
  );

  return (
    <>
      {/* PIN Modal */}
      {showPinModal && (
        <PinModal
          loading={loading}
          error={error}
          onConfirm={handleTransferSubmit}
          onClearError={() => dispatch(clearTransferError())}
          onClose={() => {
            if (!loading) {
              setShowPinModal(false);
              dispatch(resetTransferState());
            }
          }}
        />
      )}

      {/* When in Failure Step: Render TransferFailedSlip */}
      {step === "failed" ? (
        <TransferFailedSlip
          amount={Number(amount)}
          currency="MMK"
          sourceAccountNumber={sourceAccount}
          sourceDisplayName={
            accounts.find((a) => a.accountNumber === sourceAccount)?.accountType || "My Account"
          }
          destinationAccountNumber={destinationAccount}
          destinationDisplayName={recipientName || "Recipient"}
          errorReason={failureData?.reason || error || "Transaction could not be completed"}
          errorCode={failureData?.code}
          referenceId={failureData?.referenceId}
          description={description}
          onTryAgain={() => {
            setStep("form");
            setFailureData(null);
            dispatch(resetTransferState());
          }}
          onGoDashboard={() => {
            handleReset();
            navigate("/dashboard");
          }}
          onClose={() => {
            handleReset();
            navigate("/dashboard");
          }}
        />
      ) : step === "receipt" && transactionResult ? (
        <ReceiptStep
          result={{
            ...transactionResult,
            sourceAccountNumber: transactionResult.sourceAccountNumber || sourceAccount,
            destinationAccountNumber: transactionResult.destinationAccountNumber || destinationAccount,
          }}
          recipientName={recipientName}
          onNewTransfer={handleReset}
          onGoDashboard={() => navigate("/dashboard")}
          isSavedBeneficiary={isSavedBeneficiary}
          onSaveBeneficiary={handleSaveBeneficiary}
          savingBeneficiary={savingBeneficiary}
          beneficiarySaved={beneficiarySaved}
        />
      ) : (
        /* 2-Column Responsive Layout for Step 1 & Step 2 */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Left Column (Step Wizard Form) */}
          <div className="lg:col-span-8 xl:col-span-8 bg-white dark:bg-[#0A192F] rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 dark:border-slate-800">
            {/* Header with Visual Stepper */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00A3C4] to-[#0284C7] flex items-center justify-center text-white shadow-md shadow-cyan-500/25 shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-black text-[#0A192F] dark:text-white leading-tight sm:whitespace-nowrap">
                    {step === "review" ? "Review Transfer Details" : "Internal Fund Transfer"}
                  </h2>
                  <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-normal">
                    {step === "form"
                      ? "Instant, secure transfer to any account"
                      : "Confirm transfer details before PIN authorization"}
                  </p>
                </div>
              </div>

              {/* Stepper Pills */}
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                <span
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                    step === "form"
                      ? "bg-[#00A3C4] text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>Setup</span>
                </span>
                <span className="text-slate-300 dark:text-slate-600 font-bold">➔</span>
                <span
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                    step === "review"
                      ? "bg-[#00A3C4] text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>Review &amp; PIN</span>
                </span>
              </div>
            </div>

            {/* Step 1: Form */}
            {step === "form" && (
              <FormStep
                accounts={accounts}
                accountsLoading={accountsLoading}
                sourceAccount={sourceAccount}
                setSourceAccount={setSourceAccount}
                destinationAccount={destinationAccount}
                setDestinationAccount={setDestinationAccount}
                recipientName={recipientName}
                setRecipientName={setRecipientName}
                lookupLoading={lookupLoading}
                lookupError={lookupError}
                amount={amount}
                setAmount={setAmount}
                description={description}
                setDescription={setDescription}
                validationError={validationError}
                recentAccounts={recentAccounts}
                beneficiaries={beneficiaries}
                transferLimits={transferLimits}
                onContinue={handleContinue}
                onCancel={handleCancelForm}
              />
            )}

            {/* Step 2: Review */}
            {step === "review" && (
              <ReviewStep
                sourceAccount={sourceAccount}
                destinationAccount={destinationAccount}
                recipientName={recipientName}
                amount={Number(amount)}
                description={description}
                onConfirm={() => {
                  dispatch(clearTransferError());
                  setShowPinModal(true);
                }}
                onBack={() => setStep("form")}
              />
            )}
          </div>

          {/* Right Column: Live Summary & Safety Monitor */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-4 lg:sticky lg:top-24">
            {/* Live Calculation Preview Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <CreditCard className="w-4 h-4 text-[#00A3C4]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Transfer Summary
                </h3>
              </div>

              {/* Source Account Overview */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Source Account</span>
                  <span className="font-mono font-bold text-slate-800">
                    {sourceAccount ? maskAccount(sourceAccount) : "Not selected"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Current Balance</span>
                  <span className="font-bold text-slate-800">{formatMMK(currentBalance)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Available to Transfer</span>
                  <span className="font-bold text-[#00A3C4]">{formatMMK(availBalance)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-2">
                  <span className="text-slate-500 font-medium">Transfer Amount</span>
                  <span className="font-black text-[#00A3C4]">
                    -{formatMMK(transferAmountNum)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-2">
                  <span className="text-slate-700 font-bold">Available After Transfer</span>
                  <span className="font-black text-slate-900">
                    {formatMMK(newBalancePreview)}
                  </span>
                </div>
              </div>

              {/* Multi-Tier Transfer Limit Monitor */}
              {transferLimits && (
                <div className="p-3.5 rounded-2xl bg-cyan-50/70/50 border border-cyan-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#00A3C4]" />
                      Today's Limit Usage
                      <button
                        type="button"
                        onClick={() => {
                          const targetAcc = sourceAccount || accounts[0]?.accountNumber;
                          navigate("/accounts", {
                            state: {
                              accountNumber: targetAcc,
                              autoOpenLimitModal: true,
                            },
                          });
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-[#00A3C4] hover:bg-cyan-100/70 border border-cyan-200/60 transition cursor-pointer"
                        title="Adjust transfer limits in My Account"
                        aria-label="Edit transfer limits"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        <span>Edit</span>
                      </button>
                    </span>
                    <span className="font-bold text-[#00A3C4]">
                      {Math.min(
                        100,
                        Math.round(
                          (transferLimits.todayTransferredAmount /
                            Math.max(1, transferLimits.effectiveDailyLimit)) *
                            100
                        )
                      )}
                      %
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-cyan-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00A3C4] rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (transferLimits.todayTransferredAmount /
                              Math.max(1, transferLimits.effectiveDailyLimit)) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Transferred: {formatMMK(transferLimits.todayTransferredAmount)}</span>
                    <span className="font-bold text-slate-700">
                      Remaining: {formatMMK(transferLimits.remainingDailyLimit)}
                    </span>
                  </div>
                </div>
              )}

              {/* Real-time Anti-Fraud / Beneficiary Badge */}
              <div
                className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                  isBeneficiarySelected
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isBeneficiarySelected ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <span>
                    {isBeneficiarySelected
                      ? "Saved Beneficiary (High Limit)"
                      : "Standard / Unsaved Payee Limit"}
                  </span>
                </div>
              </div>
            </div>

            {/* Instant Banking Guarantee */}
            <div className="p-4 rounded-3xl bg-white border border-slate-200 text-xs text-slate-500 space-y-1.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Instant Settlement Guarantee</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Internal fund transfers are executed in real time 24/7 with zero waiting time and encrypted end-to-end.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
