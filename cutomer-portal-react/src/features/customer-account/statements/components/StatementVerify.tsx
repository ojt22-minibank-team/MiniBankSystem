import type { FC } from "react";
import { CheckCircle2, ArrowLeft, ArrowRight, Wallet, Calendar, ShieldCheck } from "lucide-react";
import type { CustomerAccount } from "../../accounts/types/accountTypes";
import type { StatementFilterForm } from "../types/statementTypes";
import { isoToDisplay } from "../types/statementTypes";

interface StatementVerifyProps {
  form: StatementFilterForm;
  account?: CustomerAccount | null;
  onChange: () => void;
  onConfirm: () => void;
}

export const StatementVerify: FC<StatementVerifyProps> = ({
  form,
  account,
  onChange,
  onConfirm,
}) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
      {/* Verify Section Header */}
      <div className="mb-6 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#0878E8]">
            <CheckCircle2 size={18} />
          </div>
          <h2 className="text-base font-bold text-[#08295C]">Verify Statement Details</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Please review your statement details before confirming.
        </p>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Account Details Card */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            <Wallet size={15} className="text-[#0878E8]" />
            <span>Account Selection</span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Account Type</span>
              <span className="text-sm font-bold text-slate-900 inline-flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                  {form.accountType}
                </span>
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-400 block font-medium">Account Number</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block tracking-wide">
                {form.accountNumber}
              </span>
              {account?.currency && (
                <span className="text-xs text-slate-500 mt-0.5 block">
                  Currency: {account.currency}
                  {account.availableBalance !== undefined && (
                    <> &bull; Balance: {Number(account.availableBalance).toLocaleString()} {account.currency}</>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Date Period Card */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            <Calendar size={15} className="text-[#0878E8]" />
            <span>Statement Period</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-slate-400 block font-medium">From Date</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                {isoToDisplay(form.fromDate)}
              </span>
              <span className="text-[11px] text-slate-400">DD-MM-YYYY</span>
            </div>

            <div>
              <span className="text-xs text-slate-400 block font-medium">To Date</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                {isoToDisplay(form.toDate)}
              </span>
              <span className="text-[11px] text-slate-400">DD-MM-YYYY</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Note */}
      <div className="mb-8 flex items-start gap-2.5 rounded-xl bg-blue-50/60 p-3.5 text-xs text-blue-900">
        <ShieldCheck size={16} className="shrink-0 text-[#0878E8] mt-0.5" />
        <p>
          Confirming these details will prepare your account statement for download. You can still return to make changes if needed.
        </p>
      </div>

      {/* Action Buttons: [Change] (Secondary) and [Confirm] (Primary) */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onChange}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <ArrowLeft size={16} />
          Change
        </button>

        <button
          type="button"
          onClick={onConfirm}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#0878E8] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#0878E8] focus:ring-offset-2"
        >
          Confirm
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
};
