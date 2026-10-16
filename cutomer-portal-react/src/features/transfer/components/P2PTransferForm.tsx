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
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ReceiptText,
  PlusCircle,
  ChevronLeft,
  Send,
  Wallet,
  X,
  Printer,
  Home,
  UserPlus,
  Users,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";


/* Helpers */


const maskAccount = (accNo: string): string => {
  if (!accNo || accNo.length < 4) return accNo;
  return `••••  ••••  ${accNo.slice(-4)}`;
};

const formatMMK = (n: number) => n.toLocaleString("en-US") + " MMK";


/* PIN Modal */


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

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 text-center mb-1">
          Enter Your PIN
        </h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          Enter your 6-digit transaction PIN to authorize this transfer
        </p>

        {/* PIN Boxes */}
        <div className="flex justify-center gap-3 mb-5">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="password"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-11 h-12 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all
                ${d ? "border-violet-500 bg-violet-50 text-violet-700" : "border-gray-200 bg-gray-50 text-gray-900"}
                focus:border-violet-500 focus:bg-violet-50 focus:ring-2 focus:ring-violet-200`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleSubmit}
          disabled={pin.length < 6 || loading}
          className="w-full py-3.5 rounded-2xl font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Processing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" /> Confirm Transfer
            </>
          )}
        </button>
      </div>
    </div>
  );
}


/* Step 1 — Transfer Form  */


interface FormStepProps {
  accounts: any[];
  accountsLoading: boolean;
  sourceAccount: string;
  setSourceAccount: (v: string) => void;
  destinationAccount: string;
  setDestinationAccount: (v: string) => void;
  recipientName: string;
  lookupLoading: boolean;
  lookupError: string;
  amount: string;
  setAmount: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  validationError: string;
  recentAccounts: string[];
  beneficiaries?: Beneficiary[];
  transferLimits?: TransferLimitInfo | null;
  onContinue: () => void;
}

function FormStep({
  accounts, accountsLoading,
  sourceAccount, setSourceAccount,
  destinationAccount, setDestinationAccount,
  recipientName, lookupLoading, lookupError,
  amount, setAmount,
  description, setDescription,
  validationError, recentAccounts,
  beneficiaries = [],
  transferLimits = null,
  onContinue,
}: FormStepProps) {
  const selectedAcc = accounts.find((a) => a.accountNumber === sourceAccount);
  const quickAmounts = [10000, 50000, 100000, 500000];

  const isBeneficiary = beneficiaries.some(
    (b) => b.beneficiaryAccountNumber === destinationAccount
  );
  const effectiveOneTimeLimit = transferLimits
    ? isBeneficiary
      ? transferLimits.effectiveOneTimeLimitBeneficiary
      : transferLimits.effectiveOneTimeLimitStranger
    : null;
  const amountNum = Number(amount) || 0;

  return (
    <div className="space-y-5">
      {/* From Account */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          From Account
        </label>
        {accountsLoading ? (
          <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading accounts...
          </div>
        ) : (
          <>
            <select
              value={sourceAccount}
              onChange={(e) => setSourceAccount(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-medium text-gray-800 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all appearance-none cursor-pointer"
              required
            >
              {accounts.length === 0 && <option value="">No accounts available</option>}
              {accounts.map((acc) => (
                <option key={acc.accountNumber} value={acc.accountNumber} disabled={acc.status !== "ACTIVE"}>
                  {acc.accountNumber} — {acc.accountType}
                  {acc.status !== "ACTIVE" ? ` [${acc.status}]` : ""}
                </option>
              ))}
            </select>
            {selectedAcc && (
              <div className="mt-2 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-blue-700 font-medium">Available Balance</span>
                </div>
                <span className="text-sm font-bold text-blue-700">
                  {Number(selectedAcc.availableBalance).toLocaleString()} MMK
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* To Account */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-gray-700">
            To Account Number
          </label>
          {beneficiaries.length > 0 && (
            <span className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
              <Users className="w-3 h-3" /> Saved Contacts
            </span>
          )}
        </div>

        {/* Saved Beneficiaries Quick Select Chips */}
        {beneficiaries.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2.5 mb-2 scrollbar-none">
            {beneficiaries.map((b) => {
              const isSelected = destinationAccount === b.beneficiaryAccountNumber;
              const initial = (b.nickname || b.beneficiaryAccountName || "B")[0].toUpperCase();
              return (
                <button
                  key={b.beneficiaryId}
                  type="button"
                  onClick={() => setDestinationAccount(b.beneficiaryAccountNumber)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0
                    ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                    }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold
                      ${isSelected ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"}`}
                  >
                    {initial}
                  </span>
                  <span>{b.nickname || b.beneficiaryAccountName}</span>
                </button>
              );
            })}
          </div>
        )}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          list="recent-destinations"
          value={destinationAccount}
          onChange={(e) => setDestinationAccount(e.target.value.replace(/\D/g, ""))}
          placeholder="Enter recipient account number"
          className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-gray-50"
          maxLength={34}
          required
        />
        <datalist id="recent-destinations">
          {recentAccounts.map((acc, i) => <option key={i} value={acc} />)}
        </datalist>

        {/* Recipient Lookup Feedback */}
        {lookupLoading && (
          <div className="flex items-center gap-2 mt-2 px-3.5 py-2 bg-blue-50/80 border border-blue-100 rounded-xl text-xs text-blue-600 font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Checking recipient account...</span>
          </div>
        )}

        {!lookupLoading && recipientName && (
          <div className="mt-2 space-y-1.5">
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-medium text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Recipient: <strong className="font-bold text-emerald-950 text-sm">{recipientName}</strong></span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                Verified
              </span>
            </div>

            {/* Beneficiary vs Stranger Status Pill */}
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
                  <span className="font-semibold">
                    {isBeneficiary ? "Saved Beneficiary" : "Unsaved Recipient (Stranger)"}
                  </span>
                </div>
                <span className="font-bold">
                  Max: {effectiveOneTimeLimit?.toLocaleString()} MMK
                </span>
              </div>
            )}
          </div>
        )}

        {!lookupLoading && lookupError && destinationAccount && (
          <div className="mt-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-xs text-red-600 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}

        {!lookupLoading && !recipientName && !lookupError && recentAccounts.length > 0 && (
          <p className="text-xs text-gray-400 mt-1.5 pl-1">
            💡 Type to see recent accounts
          </p>
        )}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Amount <span className="text-gray-400 font-normal">(MMK)</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">MMK</span>
          <input
            type="text"
            inputMode="numeric"
            value={amount ? Number(amount).toLocaleString("en-US") : ""}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              setAmount(raw);
            }}
            placeholder="0"
            className="w-full pl-14 pr-4 py-3 border-2 border-gray-100 rounded-2xl text-lg font-bold text-gray-800 placeholder-gray-300 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-gray-50"
            required
          />
        </div>

        {/* Quick amount buttons */}
        <div className="flex gap-2 mt-2">
          {quickAmounts.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(String(q))}
              className="flex-1 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition-colors"
            >
              {q >= 1000 ? `${q / 1000}K` : q}
            </button>
          ))}
        </div>

        {/* Real-time Transfer Limit Guidance Badges */}
        {transferLimits && (
          <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] flex flex-wrap items-center justify-between gap-1 text-slate-600">
            <span className="flex items-center gap-1">
              <span>One-Time Limit:</span>
              <strong className="text-slate-800">
                {effectiveOneTimeLimit ? `${effectiveOneTimeLimit.toLocaleString()} MMK` : "—"}
              </strong>
            </span>
            <span className="flex items-center gap-1">
              <span>Remaining Today:</span>
              <strong className="text-emerald-700">
                {transferLimits.remainingDailyLimit.toLocaleString()} MMK
              </strong>
            </span>
          </div>
        )}

        {/* Real-time Inline Amount Limit Warnings */}
        {amountNum > 0 && effectiveOneTimeLimit && amountNum > effectiveOneTimeLimit && (
          <p className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Amount exceeds one-time limit ({effectiveOneTimeLimit.toLocaleString()} MMK)
          </p>
        )}
        {amountNum > 0 && transferLimits && amountNum > transferLimits.remainingDailyLimit && (
          <p className="mt-1 text-xs font-semibold text-red-600 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Amount exceeds today's remaining daily limit ({transferLimits.remainingDailyLimit.toLocaleString()} MMK)
          </p>
        )}

        <p className="text-xs text-gray-400 mt-1.5 pl-1">Minimum transfer: 10,000 MMK</p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Description <span className="text-gray-400 font-normal">(Optional)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Rent, Loan repayment, Gift..."
          maxLength={255}
          className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl text-sm text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-gray-50"
        />
      </div>

      {/* Error */}
      {validationError && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-start gap-3 text-sm border border-red-100">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Continue */}
      <button
        type="button"
        onClick={onContinue}
        disabled={accounts.length === 0 || accountsLoading}
        className="w-full py-4 rounded-2xl font-bold text-white text-sm bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}


/* Step 2 — Review / Confirm */

interface ReviewStepProps {
  sourceAccount: string;
  destinationAccount: string;
  recipientName: string;
  amount: number;
  description: string;
  onConfirm: () => void;
  onBack: () => void;
}

function ReviewStep({ sourceAccount, destinationAccount, recipientName, amount, description, onConfirm, onBack }: ReviewStepProps) {
  const rows = [
    { label: "From Account", value: maskAccount(sourceAccount) },
    {
      label: "To Account",
      value: recipientName
        ? `${maskAccount(destinationAccount)} (${recipientName})`
        : maskAccount(destinationAccount),
    },
    { label: "Transfer Amount", value: formatMMK(amount), highlight: true },
    ...(description ? [{ label: "Description", value: description }] : []),
  ];

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <div className="rounded-3xl overflow-hidden border-2 border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5 text-white text-center">
          <p className="text-sm font-medium text-blue-100 mb-1">Transfer Amount</p>
          <p className="text-4xl font-black tracking-tight">
            {amount.toLocaleString()}
          </p>
          <p className="text-blue-200 text-sm font-semibold mt-1">MMK</p>
        </div>

        {/* Details */}
        <div className="bg-white px-6 py-4 divide-y divide-gray-50">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between items-center py-3">
              <span className="text-sm text-gray-500">{row.label}</span>
              <span className={`text-sm font-semibold ${row.highlight ? "text-blue-600 text-base" : "text-gray-800"}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="bg-amber-50 px-6 py-3 flex items-start gap-2 border-t border-amber-100">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Service fee may apply. You will be asked for your PIN to authorize.
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3.5 rounded-2xl font-semibold text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-[2] py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" /> Enter PIN & Transfer
        </button>
      </div>
    </div>
  );
}


/* Step 3 — Receipt */


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

  const completedDate = new Date(result.completedAt).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.transactionRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const receiptRows = [
    { label: "Reference ID", value: result.transactionRef, mono: true },
    { label: "Status", value: result.status },
    { label: "From", value: maskAccount(result.sourceAccountNumber) },
    {
      label: "To",
      value: recipientName
        ? `${maskAccount(result.destinationAccountNumber)} (${recipientName})`
        : maskAccount(result.destinationAccountNumber),
    },
    { label: "Date & Time", value: completedDate },
  ];

  return (
    <div className="space-y-0">
      {/* Success header */}
      <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-t-3xl px-6 pt-8 pb-12 text-center text-white">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/25 rounded-2xl mb-4">
          <CheckCircle2 className="w-9 h-9 text-white" />
        </div>
        <h2 className="text-xl font-black mb-1">Transfer Successful!</h2>
        <p className="text-emerald-100 text-sm mb-4">Funds have been sent successfully</p>
        <div className="bg-white/20 rounded-2xl py-3 px-6 inline-block">
          <p className="text-3xl font-black">{result.amount.toLocaleString()}</p>
          <p className="text-emerald-100 text-xs font-semibold">{result.currency}</p>
        </div>
      </div>

      {/* Receipt card (overlaps header) */}
      <div className="bg-white mx-4 -mt-6 rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Tear effect */}
        <div className="flex items-center px-4 py-2 gap-1">
          <div className="flex-1 border-t-2 border-dashed border-gray-200" />
          <ReceiptText className="w-4 h-4 text-gray-300 mx-2" />
          <div className="flex-1 border-t-2 border-dashed border-gray-200" />
        </div>

        <div className="px-5 pb-2 divide-y divide-gray-50">
          {receiptRows.map((row) => (
            <div key={row.label} className="flex justify-between items-center py-2.5">
              <span className="text-xs text-gray-500">{row.label}</span>
              <span className={`text-sm font-semibold text-gray-800 ${row.mono ? "font-mono text-xs bg-gray-100 px-2 py-1 rounded-lg" : ""}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Fee breakdown */}
        <div className="mx-5 mb-4 mt-2 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Transfer Amount</span>
            <span className="font-semibold text-gray-700">{result.amount.toLocaleString()} {result.currency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Service Fee</span>
            <span className="font-semibold text-gray-700">{result.serviceFee.toLocaleString()} {result.currency}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between">
            <span className="text-sm font-bold text-gray-800">Total Debited</span>
            <span className="text-sm font-black text-blue-600">{result.totalDebitedAmount.toLocaleString()} {result.currency}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pt-4 pb-4 space-y-2.5">
        {/* Quick Save as Beneficiary */}
        {!isSavedBeneficiary && (
          <button
            type="button"
            onClick={onSaveBeneficiary}
            disabled={savingBeneficiary}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-xs font-bold text-amber-800 hover:from-amber-100 hover:to-orange-100 transition-all disabled:opacity-60 shadow-sm"
          >
            {savingBeneficiary ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                <span>Saving to Contacts...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 text-amber-600" />
                <span>Save this recipient to Beneficiaries</span>
              </>
            )}
          </button>
        )}

        {beneficiarySaved && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Saved to your Beneficiaries!</span>
          </div>
        )}

        {/* Copy Reference & Print Receipt */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-500" />
                <span>Copy Ref</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-gray-500" />
            <span>Print Receipt</span>
          </button>
        </div>

        {/* Primary: Make Another Transfer */}
        <button
          type="button"
          onClick={onNewTransfer}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all"
        >
          <PlusCircle className="w-4 h-4" /> Make Another Transfer
        </button>

        {/* Secondary: Return to Dashboard */}
        <button
          type="button"
          onClick={onGoDashboard}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-semibold text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Home className="w-3.5 h-3.5" /> Return to Dashboard
        </button>
      </div>
    </div>
  );
}

/* Main Component */


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

  // Load transfer limits when sourceAccount changes
  useEffect(() => {
    if (sourceAccount) {
      getAccountTransferLimits(sourceAccount)
        .then(setTransferLimits)
        .catch(() => setTransferLimits(null));
    } else {
      setTransferLimits(null);
    }
  }, [sourceAccount]);

  // Load beneficiaries on mount
  useEffect(() => {
    getBeneficiaries().then(setBeneficiaries).catch(() => {});
  }, []);

  const isSavedBeneficiary = Boolean(
    beneficiarySaved ||
    (transactionResult && beneficiaries.some(
      (b) => b.beneficiaryAccountNumber === transactionResult.destinationAccountNumber
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

  // Load recent accounts & ensure latest account balances on mount
  useEffect(() => {
    dispatch(fetchMyAccounts());
    const saved = localStorage.getItem("recentDestinations");
    if (saved) setRecentAccounts(JSON.parse(saved));
    return () => { dispatch(resetTransferState()); };
  }, [dispatch]);

  // Debounced account lookup when destinationAccount changes
  useEffect(() => {
    setRecipientName("");
    setLookupError("");

    const acc = destinationAccount.trim();
    if (!acc || acc.length < 5) {
      return;
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
        setRecipientName("");
        setLookupError(err.response?.data?.message || "Account not found or inactive.");
      } finally {
        setLookupLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [destinationAccount]);

  // Go to receipt when success
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

  /* --- Step 1 → Step 2 validation --- */
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

  /* --- PIN submitted → API call --- */
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
      // Refresh notifications immediately for both success and failure
      window.dispatchEvent(new Event("new-notification-event"));
    });
  };

  /* --- Reset everything --- */
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

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <>
      {/* PIN Modal (rendered outside card) */}
      {showPinModal && (
        <PinModal
          loading={loading}
          error={error}
          onConfirm={handlePinConfirm}
          onClose={() => { if (!loading) { setShowPinModal(false); dispatch(resetTransferState()); } }}
        />
      )}

      <div className="max-w-md mx-auto">
        {/* Card */}
        <div className={`bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden ${step === "receipt" ? "" : "p-6"}`}>

          {/* Header (not shown on receipt) */}
          {step !== "receipt" && (
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-md shadow-blue-200">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">P2P Transfer</h2>
                <p className="text-xs text-gray-400">
                  {step === "form" ? "Send money to any account" : "Review your transfer"}
                </p>
              </div>
              {/* Step indicator — dot 1: form, dot 2: review */}
              <div className="ml-auto flex items-center gap-1.5">
                <div className={`h-1.5 rounded-full transition-all duration-300
                  ${step === "form" ? "w-6 bg-blue-500" : "w-2 bg-blue-200"}`}
                />
                <div className={`h-1.5 rounded-full transition-all duration-300
                  ${step === "review" ? "w-6 bg-blue-500" : "w-2 bg-gray-200"}`}
                />
              </div>
            </div>
          )}

          {/* Steps */}
          {step === "form" && (
            <FormStep
              accounts={accounts}
              accountsLoading={accountsLoading}
              sourceAccount={sourceAccount}
              setSourceAccount={setSourceAccount}
              destinationAccount={destinationAccount}
              setDestinationAccount={setDestinationAccount}
              recipientName={recipientName}
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

          {step === "receipt" && transactionResult && (
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
          )}
        </div>
      </div>
    </>
  );
};
