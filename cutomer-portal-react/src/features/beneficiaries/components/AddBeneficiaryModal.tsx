import React, { useState, useEffect } from "react";
import {
  X,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Tag,
  CreditCard,
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
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900">Add Beneficiary</h3>
            <p className="text-xs text-gray-400">Save an account for quick transfers</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Number */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
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
                className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-2xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-gray-50"
                maxLength={34}
                required
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <CreditCard className="w-5 h-5 text-gray-300" />
              </div>
            </div>

            {/* Lookup Status */}
            {lookupLoading && (
              <div className="flex items-center gap-2 mt-2 px-3.5 py-2 bg-blue-50/80 border border-blue-100 rounded-xl text-xs text-blue-600 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Checking account...</span>
              </div>
            )}

            {!lookupLoading && verifiedName && (
              <div className="mt-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-medium text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Recipient: <strong className="font-bold text-emerald-950 text-sm">{verifiedName}</strong>
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Verified
                </span>
              </div>
            )}

            {!lookupLoading && lookupError && accountNumber && (
              <div className="mt-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-xs text-red-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{lookupError}</span>
              </div>
            )}
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
              Nickname <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={verifiedName ? `e.g. ${verifiedName}` : "e.g. Mom, Rent, Office"}
                maxLength={100}
                className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-2xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-gray-50"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <Tag className="w-4 h-4 text-gray-300" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1 pl-1">
              Give this beneficiary a friendly name so you can identify it easily.
            </p>
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-xs text-red-600 font-medium">
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
              className="flex-1 py-3.5 rounded-2xl font-semibold text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!verifiedName || lookupLoading || submitting}
              className="flex-[2] py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
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