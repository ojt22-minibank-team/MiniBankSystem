import React, { useState, useEffect } from "react";
import {
  X,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Tag,
  CreditCard,
  ChevronLeft,
} from "lucide-react";
import { lookupDestinationAccount } from "../../transfer/services/transferService";
import { addBeneficiary } from "../services/beneficiaryService";
import type { Beneficiary } from "../types/beneficiaryTypes";

interface AddBeneficiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBeneficiary: Beneficiary) => void;
}

export const AddBeneficiaryModal: React.FC<AddBeneficiaryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [accountNumber, setAccountNumber] = useState("");
  const [nickname, setNickname] = useState("");

  const [lookupLoading, setLookupLoading] = useState(false);
  const [verifiedName, setVerifiedName] = useState("");
  const [lookupError, setLookupError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Debounced lookup
  useEffect(() => {
    setVerifiedName("");
    setLookupError("");

    const acc = accountNumber.trim();
    if (!acc || acc.length < 5) return;

    const timer = setTimeout(async () => {
      try {
        setLookupLoading(true);
        setLookupError("");
        const res = await lookupDestinationAccount(acc);
        if (res && res.accountName) {
          setVerifiedName(res.accountName);
        } else {
          setLookupError("Account not found");
        }
      } catch (err: any) {
        setVerifiedName("");
        setLookupError(err.response?.data?.message || "Account not found or inactive");
      } finally {
        setLookupLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [accountNumber]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim()) return;
    if (!verifiedName) {
      setSubmitError("Please enter a valid, active account number");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError("");
      const created = await addBeneficiary({
        beneficiaryAccountNumber: accountNumber.trim(),
        nickname: nickname.trim() || undefined,
      });
      onSuccess(created);
      handleClose();
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message || err.message || "Failed to add beneficiary"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setAccountNumber("");
    setNickname("");
    setVerifiedName("");
    setLookupError("");
    setSubmitError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-700/60 rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={submitting}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0f2445] rounded-xl transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00A3C4] to-[#0284C7] flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Add Beneficiary</h3>
            <p className="text-xs text-slate-400 dark:text-slate-400">Save an account for quick transfers</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Number */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Recipient Account Number
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter account number"
                className="w-full px-4 py-3.5 border-2 border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#00A3C4] focus:bg-white dark:focus:bg-[#0a192f] focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all bg-slate-50 dark:bg-[#0f2445]"
                maxLength={34}
                required
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <CreditCard className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              </div>
            </div>

            {/* Lookup Status */}
            {lookupLoading && (
              <div className="flex items-center gap-2 mt-2 px-3.5 py-2 bg-cyan-50/80 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-800/60 rounded-xl text-xs text-[#00A3C4] dark:text-cyan-300 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Checking account...</span>
              </div>
            )}

            {!lookupLoading && verifiedName && (
              <div className="mt-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-medium text-emerald-900 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Recipient: <strong className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">{verifiedName}</strong>
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                  Verified
                </span>
              </div>
            )}

            {!lookupLoading && lookupError && accountNumber && (
              <div className="mt-2 px-3 py-1.5 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-800/60 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-300 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{lookupError}</span>
              </div>
            )}
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Nickname <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={verifiedName ? `e.g. ${verifiedName}` : "e.g. Mom, Rent, Office"}
                maxLength={100}
                className="w-full px-4 py-3.5 border-2 border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#00A3C4] focus:bg-white dark:focus:bg-[#0a192f] focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all bg-slate-50 dark:bg-[#0f2445]"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <Tag className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1 pl-1">
              Give this beneficiary a friendly name so you can identify it easily.
            </p>
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-800/60 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-300 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 py-3.5 rounded-2xl font-semibold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#0f2445] hover:bg-slate-200 dark:hover:bg-[#152b4e] transition-colors flex items-center justify-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              disabled={!verifiedName || lookupLoading || submitting}
              className="flex-[2] py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-[#00A3C4] to-[#0284C7] hover:from-[#0891B2] hover:to-[#0369A1] shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Save Beneficiary
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
