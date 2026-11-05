import { useNavigate } from "react-router-dom";
import { CheckCircle2, History, Landmark, LayoutDashboard, ShieldCheck, WalletCards } from "lucide-react";
import { EkarajAuthLayout } from "../../auth/components/EkarajAuthLayout";
import { ekarajPrimaryButtonClass } from "../../auth/components/EkarajAuthStyles";
import { logoutCorporate } from "../api/auth";
import { CorporateNotice } from "../components/CorporateForm";
import { useCorporateAction } from "../hooks/useCorporateAction";

export default function CorporateAuthSuccessPage() {
  const navigate = useNavigate();
  const action = useCorporateAction();
  return (
    <EkarajAuthLayout title="EKARAJ BANK | Corporate Dashboard Preview" portalLabel="EKARAJ BANK | Corporate Portal" securityLabel="Secure Corporate Banking">
      <div className="my-3 grid w-full max-w-[1200px] rounded-3xl border border-[#CDC0A8] bg-[#F5F3EF] shadow-[0_18px_50px_-26px_rgba(18,46,82,0.3)] md:grid-cols-[200px_minmax(0,1fr)]">
        <aside aria-label="Corporate portal" className="flex flex-col justify-between gap-5 rounded-t-3xl border-b border-[#CDC0A8] bg-[#E5EAF0] p-4 text-[#1A365D] md:rounded-l-3xl md:rounded-tr-none md:border-r md:border-b-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider">Corporate Banking</p>
            <p aria-current="page" className="mt-3 flex items-center gap-2 rounded-xl border border-[#C6A15B]/40 bg-[#FAF9F7] px-3 py-2.5 text-sm font-semibold"><LayoutDashboard aria-hidden="true" size={18} className="text-[#C6A15B]" />Dashboard Preview</p>
            <p className="mt-3 text-xs leading-5 text-[#59697D]">A demonstration of the Corporate Banking dashboard. Financial services are not connected.</p>
          </div>
          <form onSubmit={event => {
            event.preventDefault();
            void action.run(async () => {
              if (await logoutCorporate()) await navigate("/corporate/login", { replace: true });
            });
          }} className="space-y-3">
            <CorporateNotice error message={action.error} />
            <button type="submit" disabled={action.busy} aria-busy={action.busy} data-variant="login" className={ekarajPrimaryButtonClass}>
              {action.busy && <span aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#122E52]/25 border-t-[#122E52] motion-reduce:animate-none" />}
              {action.busy ? "Please wait..." : "Corporate Logout"}
            </button>
          </form>
        </aside>
        <section aria-labelledby="corporate-dashboard-heading" className="min-w-0 space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#CDC0A8] pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#59697D]">Welcome to EKARAJ BANK</p>
              <h1 id="corporate-dashboard-heading" className="mt-1 font-serif text-2xl font-medium leading-8 text-[#1A365D]">Corporate Banking Dashboard</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-[#122E52]"><CheckCircle2 aria-hidden="true" size={17} className="shrink-0" />Authentication successful</p>
            </div>
            <span className="rounded-full border border-[#C6A15B] bg-[#FAF9F7] px-3 py-1 text-xs font-semibold text-[#1A365D]">Demonstration only</span>
          </div>
          <div role="note" className="flex items-start gap-2.5 rounded-xl border border-[#C6D5E3] bg-[#EAF2FA] p-3 text-sm leading-5 text-[#122E52]">
            <ShieldCheck aria-hidden="true" size={20} className="shrink-0" />
            <p>This is a dashboard preview. Live company details, balances, accounts and transactions are not connected. No financial data is displayed.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <section aria-labelledby="corporate-company-overview" className="rounded-2xl border border-[#CDC0A8] bg-white p-4 shadow-sm">
              <h2 id="corporate-company-overview" className="flex items-center gap-2 text-sm font-semibold text-[#1A365D]"><Landmark aria-hidden="true" size={19} className="text-[#C6A15B]" />Company Overview</h2>
              <p className="mt-3 text-sm font-medium text-[#122E52]">Company details unavailable</p>
              <p className="mt-1 text-xs leading-5 text-[#59697D]">Company information is not loaded in this demonstration.</p>
            </section>
            <section aria-labelledby="corporate-total-balance" className="rounded-2xl border border-[#CDC0A8] bg-[#F5F3EF] p-4 text-[#122E52] shadow-sm">
              <h2 id="corporate-total-balance" className="flex items-center gap-2 text-sm font-semibold text-[#1A365D]"><WalletCards aria-hidden="true" size={19} className="text-[#C6A15B]" />Total Balance</h2>
              <p className="mt-3 text-xl font-semibold">Not available</p>
              <p className="mt-1 text-xs leading-5 text-[#59697D]">A live balance is not connected to this preview.</p>
            </section>
          </div>
          <section aria-labelledby="corporate-company-accounts" className="rounded-2xl border border-[#CDC0A8] bg-white p-4 shadow-sm">
            <h2 id="corporate-company-accounts" className="flex items-center gap-2 text-sm font-semibold text-[#1A365D]"><WalletCards aria-hidden="true" size={19} className="text-[#C6A15B]" />Company Accounts</h2>
            <p className="mt-2 text-sm text-[#122E52]">Company accounts are not connected.</p>
            <p className="mt-1 text-xs leading-5 text-[#59697D]">Account numbers and balances are unavailable in this preview.</p>
          </section>
          <section aria-labelledby="corporate-recent-transactions" className="rounded-2xl border border-[#CDC0A8] bg-white p-4 shadow-sm">
            <h2 id="corporate-recent-transactions" className="flex items-center gap-2 text-sm font-semibold text-[#1A365D]"><History aria-hidden="true" size={19} className="text-[#C6A15B]" />Recent Transactions</h2>
            <p className="mt-2 text-sm text-[#122E52]">Transaction history is not connected.</p>
            <p className="mt-1 text-xs leading-5 text-[#59697D]">No sample transactions are presented as real banking activity.</p>
          </section>
        </section>
      </div>
    </EkarajAuthLayout>
  );
}
