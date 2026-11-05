import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { getBeneficiaries, deleteBeneficiary } from "../services/beneficiaryService";
import type { Beneficiary } from "../types/beneficiaryTypes";
import { BeneficiaryList } from "../components/BeneficiaryList";
import { AddBeneficiaryModal } from "../components/AddBeneficiaryModal";

export default function BeneficiariesPage() {
  const navigate = useNavigate();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchList = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBeneficiaries();
      setBeneficiaries(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to load beneficiaries."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddSuccess = (newB: Beneficiary) => {
    setBeneficiaries((prev) => [newB, ...prev.filter((b) => b.beneficiaryId !== newB.beneficiaryId)]);
    showToast(`Successfully added "${newB.nickname || newB.beneficiaryAccountName}"!`);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBeneficiary(id);
      setBeneficiaries((prev) => prev.filter((b) => b.beneficiaryId !== id));
      showToast("Beneficiary removed successfully.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to remove beneficiary.");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner / Toast */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center gap-3 text-sm text-emerald-800 dark:text-emerald-300 font-semibold shadow-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-2xl bg-white dark:bg-[#0f2445] border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#152b4e] hover:border-slate-300 dark:hover:border-slate-600 shadow-sm transition"
            title="Back to previous page"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00A3C4] to-[#0284C7] flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0A192F] dark:text-white tracking-tight">
              Beneficiaries
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Manage saved accounts for instant and error-free transfers
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-[#00A3C4] to-[#0284C7] hover:from-[#0891B2] hover:to-[#0369A1] shadow-lg shadow-cyan-500/25 hover:shadow-xl transition-all"
        >
          <UserPlus className="w-4 h-4" /> Add Beneficiary
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl flex items-center gap-3 text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* List */}
      <BeneficiaryList
        beneficiaries={beneficiaries}
        loading={loading}
        onDelete={handleDelete}
        onAddNew={() => setIsModalOpen(true)}
      />

      {/* Add Modal */}
      <AddBeneficiaryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
