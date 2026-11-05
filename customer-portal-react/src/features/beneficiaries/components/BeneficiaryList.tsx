import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  Send,
  Trash2,
  Copy,
  Check,
  Building2,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { Beneficiary } from "../types/beneficiaryTypes";

interface BeneficiaryListProps {
  beneficiaries: Beneficiary[];
  loading: boolean;
  onDelete: (id: string) => Promise<void>;
  onAddNew: () => void;
}

export const BeneficiaryList: React.FC<BeneficiaryListProps> = ({
  beneficiaries,
  loading,
  onDelete,
  onAddNew,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCopy = async (accNo: string, id: string) => {
    try {
      await navigator.clipboard.writeText(accNo);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleTransfer = (accountNumber: string) => {
    // Navigate to transfer page and we can pass state
    navigate("/transfer", { state: { destinationAccount: accountNumber } });
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      setDeletingId(id);
      await onDelete(id);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = beneficiaries.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.nickname?.toLowerCase().includes(q) ||
      b.beneficiaryAccountName?.toLowerCase().includes(q) ||
      b.beneficiaryAccountNumber?.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search beneficiaries by name, nickname, or account number..."
          className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-[#0f2445] border border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#00A3C4] focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#00A3C4]" />
          <p className="text-sm font-medium text-slate-400">Loading beneficiaries...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && beneficiaries.length === 0 && (
        <div className="bg-white dark:bg-[#0a192f] rounded-3xl border border-dashed border-slate-200 dark:border-slate-700/60 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-50 dark:bg-cyan-500/15 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[#00A3C4]" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">No Beneficiaries Saved Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Save frequently used accounts for faster, error-free transfers without having to type account numbers every time.
          </p>
          <button
            onClick={onAddNew}
            className="px-6 py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-[#00A3C4] to-[#0284C7] hover:from-[#0891B2] hover:to-[#0369A1] shadow-lg shadow-cyan-500/25 transition-all inline-flex items-center gap-2"
          >
            + Add Your First Beneficiary
          </button>
        </div>
      )}

      {/* No Results from search */}
      {!loading && beneficiaries.length > 0 && filtered.length === 0 && (
        <div className="bg-white dark:bg-[#0a192f] rounded-3xl border border-slate-100 dark:border-slate-800 p-10 text-center">
          <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No beneficiaries matched "{search}"</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try searching with a different keyword</p>
        </div>
      )}

      {/* Beneficiaries Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((b) => {
            const initials = (b.beneficiaryAccountName || b.nickname || "B")
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0].toUpperCase())
              .join("");

            const dateStr = b.createdAt
              ? new Date(b.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : null;

            return (
              <div
                key={b.beneficiaryId}
                className="bg-white dark:bg-[#0a192f] rounded-3xl p-5 border border-slate-100 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-500/50 hover:shadow-lg transition-all group flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Avatar, Nickname/Name, Delete */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00A3C4] to-[#0284C7] flex items-center justify-center text-white font-black text-sm shadow-md shadow-cyan-500/20">
                        {initials}
                      </div>

                      <div>
                        <h4 className="font-black text-base text-slate-900 dark:text-white group-hover:text-[#00A3C4] transition-colors">
                          {b.nickname || b.beneficiaryAccountName}
                        </h4>
                        {b.nickname && b.beneficiaryAccountName && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {b.beneficiaryAccountName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Delete Action */}
                    <button
                      onClick={() => setConfirmDeleteId(b.beneficiaryId)}
                      title="Remove beneficiary"
                      className="p-2 text-slate-300 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Account Number Box */}
                  <div className="bg-slate-50 dark:bg-[#0f2445] rounded-2xl p-3 flex items-center justify-between border border-slate-100 dark:border-slate-700/50 mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {b.beneficiaryAccountNumber}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        handleCopy(b.beneficiaryAccountNumber, b.beneficiaryId)
                      }
                      className="p-1.5 text-slate-400 hover:text-[#00A3C4] rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                    >
                      {copiedId === b.beneficiaryId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Footer: Date & Transfer Action */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                    {dateStr && (
                      <>
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Added {dateStr}</span>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => handleTransfer(b.beneficiaryAccountNumber)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#00A3C4] bg-cyan-50 dark:bg-cyan-500/15 hover:bg-[#00A3C4] hover:text-white transition-all shadow-sm"
                  >
                    <Send className="w-3 h-3" /> Send Money
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmDeleteId(null)}
          />
          <div className="relative bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-700/60 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white text-center mb-1">
              Remove Beneficiary?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">
              Are you sure you want to remove this account from your beneficiaries list? You can add it back anytime.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 rounded-2xl font-semibold text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#0f2445] hover:bg-slate-200 dark:hover:bg-[#152b4e] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="flex-1 py-3 rounded-2xl font-bold text-xs text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-1.5"
              >
                {deletingId === confirmDeleteId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Removing...
                  </>
                ) : (
                  "Yes, Remove"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
