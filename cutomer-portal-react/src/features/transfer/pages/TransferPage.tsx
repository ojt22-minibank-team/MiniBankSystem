import { Link } from "react-router-dom";
import { P2PTransferForm } from "../components/P2PTransferForm";

export default function TransferPage() {
  return (
    <div>
      <div className="mb-6 no-print">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold">
          <Link
            to="/dashboard"
            className="text-slate-500 transition-colors hover:text-[#00A3C4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3C4]"
          >
            Dashboard
          </Link>
          <span className="text-slate-300" aria-hidden="true">/</span>
          <span className="text-[#00A3C4]" aria-current="page">Internal Transfer</span>
        </nav>
        <h1 className="text-2xl font-extrabold text-[#0A192F] dark:text-white">Transfer &amp; Payments</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Send money securely to any account
        </p>
      </div>
      <P2PTransferForm />
    </div>
  );
}
