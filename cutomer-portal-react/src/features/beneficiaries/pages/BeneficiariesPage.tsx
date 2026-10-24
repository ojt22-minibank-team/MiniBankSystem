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
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-sm text-emerald-800 font-semibold shadow-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-2xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition"
            title="Back to previous page"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Beneficiaries
            </h1>
            <p className="text-xs font-medium text-gray-400">
              Manage saved accounts for instant and error-free transfers
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-200 hover:shadow-xl transition-all"
        >
          <UserPlus className="w-4 h-4" /> Add Beneficiary
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-sm text-red-700">
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