import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { P2PTransferForm } from "../components/P2PTransferForm";

export default function TransferPage() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="mb-6 flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-2xl bg-white dark:bg-[#0f2445] border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:text-[#00A3C4] hover:bg-cyan-50/50 dark:hover:bg-[#152b4e] hover:border-cyan-300 shadow-sm transition"
          title="Back to previous page"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-[#0A192F] dark:text-white">Transfer &amp; Payments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Send money securely to any account
          </p>
        </div>
      </div>
      <P2PTransferForm />
    </div>
  );
}
