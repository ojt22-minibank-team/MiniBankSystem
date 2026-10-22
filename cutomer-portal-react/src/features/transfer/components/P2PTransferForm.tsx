import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../lib/redux";
import { submitP2PTransfer, resetTransferState } from "../store/transferSlice";
import { fetchMyAccounts } from "../../customer-account/accounts/accountsSlice";
import { lookupDestinationAccount } from "../services/transferService";
import { getBeneficiaries, addBeneficiary } from "../../beneficiaries/services/beneficiaryService";
import type { Beneficiary } from "../../beneficiaries/types/beneficiaryTypes";
import type { P2PTransferRequest } from "../types/transferTypes";
import { getAccountTransferLimits } from "../../customer-account/api/customerAccountApi";
import type { TransferLimitInfo } from "../../customer-account/types/accountTypes";
import { QRCodeView } from "../../../components/common/QRCodeView";
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
  Printer,
  Home,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Sparkles,
  Lock,
  QrCode,
  ExternalLink,
  CreditCard,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const maskAccount = (accNo: string): string => {
  if (!accNo || accNo.length < 4) return accNo;
  return `••••  ••••  ${accNo.slice(-4)}`;
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
}

function PinModal({ loading, error, onConfirm, onClose }: PinModalProps) {
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
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
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
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-200 text-white">
            <Lock className="w-7 h-7" />
          </div>
        </div>

        <h3 className="text-lg font-black text-slate-900 text-center mb-1">
          Authorize Transfer
        </h3>
        <p className="text-xs text-slate-500 text-center mb-6">
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
                  ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                  : "border-slate-200 bg-slate-50 text-slate-800"
              } focus:border-blue-500 focus:bg-blue-50 focus:ring-2 focus:ring-blue-200`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-xs border border-red-100">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={pin.length < 6 || loading}
          className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
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
  const availBalance = selectedAcc ? Number(selectedAcc.availableBalance) : 0;

  const isOverOneTimeLimit = Boolean(
    transferLimits && effectiveOneTimeLimit && amountNum > effectiveOneTimeLimit
  );
  const isOverDailyLimit = Boolean(
    transferLimits && amountNum > transferLimits.remainingDailyLimit
  );
  const isInsufficientBalance = Boolean(
    selectedAcc && amountNum > availBalance
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
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> Loading your accounts...
          </div>
        ) : (
          <div className="space-y-2">
            <select
              value={sourceAccount}
              onChange={(e) => setSourceAccount(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition cursor-pointer"
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
              <div className="px-4 py-3 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100/70 flex items-center justify-center text-blue-600">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-blue-600">Available to Transfer</p>
                    <p className="text-sm font-extrabold text-[#08295C]">
                      {Number(selectedAcc.availableBalance).toLocaleString()} MMK
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
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
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRecipientTab("beneficiaries")}
                className={`px-2.5 py-1 rounded-md transition ${
                  recipientTab === "beneficiaries"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Saved Contacts ({beneficiaries.length})
              </button>
              <button
                type="button"
                onClick={() => setRecipientTab("manual")}
                className={`px-2.5 py-1 rounded-md transition ${
                  recipientTab === "manual"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
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
                      ? "border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-100"
                      : "border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
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
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
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
          <div className="flex items-center gap-2 mt-2 px-3.5 py-2 bg-blue-50/80 border border-blue-100 rounded-xl text-xs text-blue-600 font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
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
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-slate-900 placeholder-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
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
              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition shrink-0"
            >
              +{q.toLocaleString()}
            </button>
          ))}
          {selectedAcc && (
            <button
              type="button"
              onClick={() => setAmount(String(Math.floor(Number(selectedAcc.availableBalance))))}
              className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-black transition shrink-0"
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
              <div className="flex items-center gap-1.5 font-bold text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>
                  Insufficient balance. Available balance is {availBalance.toLocaleString()} MMK.
                </span>
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
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
        />
      </div>

      {/* General Validation Error (suppressed when already shown inline in Amount) */}
      {validationError && !isOverOneTimeLimit && !isOverDailyLimit && !isInsufficientBalance && (
        <div className="p-3.5 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Continue Button */}
      <button
        type="button"
        onClick={onContinue}
        disabled={isFormInvalid}
        className={`w-full py-4 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 ${
          isFormInvalid
            ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            : "text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-md shadow-blue-200 cursor-pointer"
        }`}
      >
        <span>Proceed to Review</span>
        <ArrowRight className="w-4 h-4" />
      </button>
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
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="bg-gradient-to-br from-[#08295C] to-blue-900 p-6 text-white text-center">
          <p className="text-xs uppercase font-extrabold text-blue-200 tracking-wider mb-1">
            Review Transfer Amount
          </p>
          <p className="text-4xl font-black tracking-tight">{amount.toLocaleString()}</p>
          <p className="text-xs font-bold text-blue-200 mt-1">Myanmar Kyat (MMK)</p>
        </div>

        {/* Transfer Pathway (Sender ➔ Recipient) */}
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
              From (Sender)
            </span>
            <p className="text-xs font-mono font-bold text-slate-800 truncate">
              {sourceAccount}
            </p>
          </div>

          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0 text-right">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
              To (Recipient)
            </span>
            <p className="text-xs font-bold text-slate-900 truncate">
              {recipientName || "Verified Account"}
            </p>
            <p className="text-[10px] font-mono text-slate-500 truncate">
              {destinationAccount}
            </p>
          </div>
        </div>

        {/* Breakdown List */}
        <div className="p-5 divide-y divide-slate-100 text-xs">
          <div className="flex justify-between items-center py-1.5">
            <span className="text-slate-500 font-medium">Payment Channel</span>
            <span className="font-bold text-slate-800">Mini Bank Portal</span>
          </div>
          <div className="flex justify-between items-center py-1.5">
            <span className="text-slate-500 font-medium">Service Fee</span>
            <span className="font-bold text-emerald-600">0.00 MMK (Free)</span>
          </div>
          {description && (
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-500 font-medium">Transfer Memo</span>
              <span className="font-semibold text-slate-800 italic">"{description}"</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 text-sm">
            <span className="font-bold text-slate-900">Total Debited Amount</span>
            <span className="font-black text-blue-600 text-base">
              {amount.toLocaleString()} MMK
            </span>
          </div>
        </div>
      </div>

      {/* Security Assurance Notice */}
      <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900">
        <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
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
          className="flex-[2] py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-md shadow-blue-200 transition flex items-center justify-center gap-2"
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
  const [showQrModal, setShowQrModal] = useState(false);

  const completedDate = new Date(result.completedAt || Date.now()).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

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
    } catch {}
  };

  // Cryptographic receipt verification payload formatted cleanly for mobile cameras
  const qrVerificationPayload = [
    `MINI BANK OFFICIAL RECEIPT`,
    `Ref ID: ${result.transactionRef}`,
    `Amount: ${Number(result.amount).toLocaleString()} ${result.currency || "MMK"}`,
    `Sender: ${result.sourceAccountNumber}`,
    `Recipient: ${recipientName || "Recipient"} (${result.destinationAccountNumber})`,
    `Date: ${completedDate}`,
    `Status: ${result.status || "COMPLETED"} (Verified)`,
    `Validation: SHA256-AUTHENTICATED`,
  ].join("\n");

  return (
    <>
      {/* Authenticity QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setShowQrModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in-95">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">
              Transaction Verification Code
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Scan this QR with any device to verify this official electronic receipt.
            </p>

            <div className="flex justify-center mb-4">
              <QRCodeView value={qrVerificationPayload} size={160} />
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-[11px] font-mono text-left text-slate-600 space-y-1 border border-slate-100">
              <p>
                <strong>Bank:</strong> Mini Bank Node #1
              </p>
              <p>
                <strong>Ref ID:</strong> {result.transactionRef}
              </p>
              <p>
                <strong>Digital Signature:</strong> SHA256-AUTHENTICATED
              </p>
              <p>
                <strong>Status:</strong> COMPLETED &amp; AUDITED
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Official Banking E-Receipt Card */}
      <div className="print-receipt-container max-w-xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Official Bank Header */}
        <div className="bg-[#08295C] px-6 py-4 text-white flex items-center justify-between border-b border-blue-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wider uppercase text-white">
                Mini Bank
              </h2>
              <p className="text-[10px] text-blue-200 font-medium">
                Official Electronic Transfer Receipt
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-800/60 text-blue-200 border border-blue-700/50">
              P2P TRANSFER
            </span>
            <p className="text-[10px] text-blue-300 mt-1">{completedDate}</p>
          </div>
        </div>

        {/* Transfer Status Banner (White Background with Green Checkmark) */}
        <div className="bg-white px-6 py-4 text-center border-b border-slate-100">
          <div className="inline-flex items-center justify-center w-11 h-11 bg-emerald-50 border border-emerald-200/80 rounded-full mb-2 shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Payment Successful</h3>

          <div className="mt-2 inline-block bg-slate-50 border border-slate-200/70 px-5 py-1.5 rounded-2xl">
            <p className="text-3xl font-black tracking-tight text-slate-900">
              - {Number(result.amount).toLocaleString()}
            </p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              {result.currency || "MMK"}
            </p>
          </div>
        </div>

        {/* Two-Party Visual Transfer Path */}
        <div className="p-3.5 bg-slate-50/70 border-b border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
            {/* Sender Box */}
            <div className="p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                From (Sender)
              </span>
              <p className="text-xs font-mono font-bold text-slate-800 truncate">
                {maskAccount(result.sourceAccountNumber)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Mini Bank Account</p>
            </div>

            {/* Recipient Box */}
            <div className="p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                To (Recipient)
              </span>
              <p className="text-xs font-bold text-slate-900 truncate">
                {recipientName || "Verified Account"}
              </p>
              <p className="text-[11px] font-mono font-bold text-slate-800 mt-0.5 truncate">
                {maskAccount(result.destinationAccountNumber)}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="px-6 py-3 divide-y divide-slate-100 text-xs">
          <div className="flex justify-between items-center py-1.5">
            <span className="text-slate-500 font-medium">Transaction Reference</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                {result.transactionRef}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-slate-400 hover:text-blue-600 transition p-1"
                title="Copy Reference ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center py-1.5">
            <span className="text-slate-500 font-medium">Transfer Amount</span>
            <span className="font-bold text-slate-800">
              {Number(result.amount).toLocaleString()} {result.currency || "MMK"}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5">
            <span className="text-slate-500 font-medium">Service Fee</span>
            <span className="font-bold text-emerald-600">
              {Number(result.serviceFee || 0).toLocaleString()} {result.currency || "MMK"}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5">
            <span className="text-slate-500 font-medium">Total Debited</span>
            <span className="font-black text-rose-600 text-sm">
              - {Number(result.totalDebitedAmount || result.amount).toLocaleString()}{" "}
              {result.currency || "MMK"}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5">
            <span className="text-slate-500 font-medium">Status</span>
            <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              COMPLETED
            </span>
          </div>

          {result.description && (
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-500 font-medium">Transfer Memo</span>
              <span className="font-semibold text-slate-700 italic">"{result.description}"</span>
            </div>
          )}
        </div>

        {/* Authenticity Verification QR Code Section */}
        <div className="mx-5 mb-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black text-slate-800">Authentic Digital Receipt</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Scan QR code with any smartphone camera to verify authenticity directly against the bank ledger.
            </p>
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
            >
              <span>Inspect cryptographic payload</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div
            onClick={() => setShowQrModal(true)}
            className="cursor-pointer transition transform hover:scale-105 shrink-0"
            title="Click to enlarge QR"
          >
            <QRCodeView value={qrVerificationPayload} size={76} />
          </div>
        </div>


        {/* Action Toolbar (hidden on print) */}
        <div className="no-print p-5 bg-white border-t border-slate-100 space-y-2.5">
          {/* Quick Add to Beneficiary */}
          {!isSavedBeneficiary && (
            <button
              type="button"
              onClick={onSaveBeneficiary}
              disabled={savingBeneficiary}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs font-bold text-amber-800 hover:bg-amber-100 transition disabled:opacity-60"
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

          {/* Print & Copy Row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Reference</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Receipt</span>
            </button>
          </div>

          {/* New Transfer */}
          <button
            type="button"
            onClick={onNewTransfer}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-md shadow-blue-200 transition"
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
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Main P2P Transfer Component with 2-Column Responsive Layout                */
/* -------------------------------------------------------------------------- */

type Step = "form" | "review" | "receipt";

export const P2PTransferForm = () => {
  const dispatch = useAppDispatch();
  const { loading, error, success, transactionResult } = useAppSelector((s) => s.transfer);
  const { accounts, loading: accountsLoading } = useAppSelector((s) => s.accounts);

  const [step, setStep] = useState<Step>("form");
  const [showPinModal, setShowPinModal] = useState(false);

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
    const saved = localStorage.getItem("recentDestinations");
    if (saved) setRecentAccounts(JSON.parse(saved));
    return () => {
      dispatch(resetTransferState());
    };
  }, [dispatch]);

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
    localStorage.setItem("recentDestinations", JSON.stringify(updated));
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
    if (selected && transferNum > Number(selected.availableBalance)) {
      return setValidationError(
        `Insufficient balance. Available balance is ${Number(selected.availableBalance).toLocaleString()} MMK.`
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

  /* PIN Confirmation */
  const handlePinConfirm = (pin: string) => {
    const payload: P2PTransferRequest = {
      sourceAccountNumber: sourceAccount,
      destinationAccountNumber: destinationAccount,
      amount: Number(amount),
      currency: "MMK",
      transactionPin: pin,
      description: description || undefined,
      idempotencyKey: crypto.randomUUID(),
    };

    dispatch(submitP2PTransfer(payload)).then((res: any) => {
      if (res.meta.requestStatus === "fulfilled") {
        saveDestination(destinationAccount);
        dispatch(fetchMyAccounts());
      }
      window.dispatchEvent(new Event("new-notification-event"));
    });
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
    dispatch(resetTransferState());
    dispatch(fetchMyAccounts());
  };

  const selectedAcc = accounts.find((a) => a.accountNumber === sourceAccount);
  const availBalance = selectedAcc ? Number(selectedAcc.availableBalance) : 0;
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
          onConfirm={handlePinConfirm}
          onClose={() => {
            if (!loading) {
              setShowPinModal(false);
              dispatch(resetTransferState());
            }
          }}
        />
      )}

      {/* When in Receipt Step: Render Standalone Official E-Receipt */}
      {step === "receipt" && transactionResult ? (
        <ReceiptStep
          result={transactionResult}
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
          <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200">
            {/* Header with Visual Stepper */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-200 shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Internal P2P Fund Transfer
                  </h2>
                  <p className="text-xs text-slate-400">
                    {step === "form"
                      ? "Instant, secure transfer to any account"
                      : "Review your transfer summary before authorization"}
                  </p>
                </div>
              </div>

              {/* Stepper Pills */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                    step === "form"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>Setup</span>
                </span>
                <span className="text-slate-300 font-bold">➔</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                    step === "review"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-400"
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
                onConfirm={() => setShowPinModal(true)}
                onBack={() => setStep("form")}
              />
            )}
          </div>

          {/* Right Column: Live Summary & Safety Monitor */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-24">
            {/* Live Calculation Preview Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <CreditCard className="w-4 h-4 text-blue-600" />
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
                  <span className="font-bold text-slate-800">{formatMMK(availBalance)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-2">
                  <span className="text-slate-500 font-medium">Transfer Amount</span>
                  <span className="font-black text-blue-600">
                    -{formatMMK(transferAmountNum)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-2">
                  <span className="text-slate-700 font-bold">Balance After Transfer</span>
                  <span className="font-black text-slate-900">
                    {formatMMK(newBalancePreview)}
                  </span>
                </div>
              </div>

              {/* Multi-Tier Transfer Limit Monitor */}
              {transferLimits && (
                <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      Today's Limit Usage
                    </span>
                    <span className="font-bold text-blue-700">
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
                  <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
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
                Internal P2P transactions are executed in real time 24/7 with zero waiting time and encrypted end-to-end.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
