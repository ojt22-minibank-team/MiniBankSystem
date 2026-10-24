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
          className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition"
          title="Back to previous page"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Transfer &amp; Payments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Send money securely to any account
          </p>
        </div>
      </div>
      <P2PTransferForm />
    </div>
  );
}
