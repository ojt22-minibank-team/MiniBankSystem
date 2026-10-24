import { useRef, type ChangeEvent, type FormEvent, type FC } from "react";
import { Calendar, ChevronDown, Wallet, Info } from "lucide-react";
import type { CustomerAccount } from "../../accounts/types/accountTypes";
import type {
  StatementAccountType,
  StatementFilterForm,
} from "../types/statementTypes";
import { isoToDisplay, displayToIso } from "../types/statementTypes";

interface StatementFormProps {
  form: StatementFilterForm;
  accounts: CustomerAccount[];
  selectedAccount: CustomerAccount | null;
  onAccountTypeChange: (type: StatementAccountType) => void;
  onAccountNumberChange: (accountNumber: string) => void;
  onFromDateChange: (isoDate: string) => void;
  onToDateChange: (isoDate: string) => void;
  onContinue: () => void;
  isContinueDisabled?: boolean;
}

// Format raw digits to DD-MM-YYYY as user types
function formatToDatePattern(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

// Controlled date field that strictly displays DD-MM-YYYY and emits YYYY-MM-DD
function ControlledDateField({
  id,
  label,
  isoValue,
  maxIso,
  onChangeIso,
}: {
  id: string;
  label: string;
  isoValue: string;
  maxIso: string;
  onChangeIso: (iso: string) => void;
}) {
  const hiddenDateRef = useRef<HTMLInputElement>(null);
  const displayValue = isoToDisplay(isoValue);

  const handleTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatToDatePattern(e.target.value);
    if (formatted.length === 10) {
      const iso = displayToIso(formatted);
      onChangeIso(iso);
    } else {
      // Partial typing; keep tracking or clear if emptied
      if (formatted === "") {
        onChangeIso("");
      }
    }
  };

  const handleNativePickerChange = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.value; // YYYY-MM-DD
    if (picked) {
      onChangeIso(picked);
    }
  };

  const openNativePicker = () => {
    if (hiddenDateRef.current) {
      if (typeof hiddenDateRef.current.showPicker === "function") {
        try {
          hiddenDateRef.current.showPicker();
        } catch {
          hiddenDateRef.current.focus();
        }
      } else {
        hiddenDateRef.current.focus();
      }
    }
  };

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={displayValue}
          onChange={handleTextChange}
          placeholder="DD-MM-YYYY"
          maxLength={10}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-sm font-medium text-slate-800 placeholder-slate-400 transition-colors focus:border-[#0878E8] focus:outline-none focus:ring-2 focus:ring-[#0878E8]/20"
        />
        {/* Native Hidden Date Picker Overlay Trigger */}
        <input
          ref={hiddenDateRef}
          type="date"
          value={isoValue}
          max={maxIso}
          onChange={handleNativePickerChange}
          tabIndex={-1}
          className="sr-only"
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={openNativePicker}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#0878E8] hover:bg-slate-50 rounded-lg transition-colors"
          title="Open calendar"
          aria-label={`Open calendar for ${label}`}
        >
          <Calendar size={18} />
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">Display format: DD-MM-YYYY</p>
    </div>
  );
}

export const StatementForm: FC<StatementFormProps> = ({
  form,
  accounts,
  selectedAccount,
  onAccountTypeChange,
  onAccountNumberChange,
  onFromDateChange,
  onToDateChange,
  onContinue,
  isContinueDisabled = false,
}) => {
  // Filter active accounts of selected type
  const activeAccounts = accounts.filter(
    (acc) => acc.accountType === form.accountType && acc.status === "ACTIVE"
  );

  // Today in YYYY-MM-DD
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isContinueDisabled) {
      onContinue();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 2-Column Responsive Layout for Criteria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Field 1: Account Type Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Account Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => onAccountTypeChange("CURRENT")}
              className={`py-2 px-3 text-sm font-semibold rounded-lg transition-all ${
                form.accountType === "CURRENT"
                  ? "bg-white text-[#0878E8] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Current Account
            </button>
            <button
              type="button"
              onClick={() => onAccountTypeChange("SAVINGS")}
              className={`py-2 px-3 text-sm font-semibold rounded-lg transition-all ${
                form.accountType === "SAVINGS"
                  ? "bg-white text-[#0878E8] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Savings Account
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Filter accounts by category
          </p>
        </div>

        {/* Field 2: Account Number Dropdown */}
        <div>
          <label htmlFor="accountNumberSelect" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Account Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              id="accountNumberSelect"
              value={form.accountNumber}
              onChange={(e) => onAccountNumberChange(e.target.value)}
              disabled={activeAccounts.length === 0}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-slate-800 transition-colors focus:border-[#0878E8] focus:outline-none focus:ring-2 focus:ring-[#0878E8]/20 disabled:bg-slate-50 disabled:text-slate-400"
            >
              {activeAccounts.length === 0 ? (
                <option value="">No active {form.accountType} accounts found</option>
              ) : (
                activeAccounts.map((acc) => (
                  <option key={acc.accountNumber} value={acc.accountNumber}>
                    {acc.accountNumber} ({acc.currency})
                  </option>
                ))
              )}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <ChevronDown size={18} />
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Only active {form.accountType.toLowerCase()} accounts are selectable
          </p>
        </div>

        {/* Field 3: From Date */}
        <ControlledDateField
          id="fromDate"
          label="From Date"
          isoValue={form.fromDate}
          maxIso={todayIso}
          onChangeIso={onFromDateChange}
        />

        {/* Field 4: To Date */}
        <ControlledDateField
          id="toDate"
          label="To Date"
          isoValue={form.toDate}
          maxIso={todayIso}
          onChangeIso={onToDateChange}
        />
      </div>

      {/* Selected Account Overview Preview Chip */}
      {selectedAccount && (
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0878E8]">
              <Wallet size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{selectedAccount.accountNumber}</span>
                <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                  {selectedAccount.accountType}
                </span>
                <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  {selectedAccount.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Opened: {isoToDisplay(selectedAccount.openedAt ? selectedAccount.openedAt.substring(0, 10) : "")}
              </p>
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Available Balance</p>
            <p className="text-sm font-bold text-slate-900">
              {Number(selectedAccount.availableBalance || 0).toLocaleString()} {selectedAccount.currency}
            </p>
          </div>
        </div>
      )}

      {/* Information Tip */}
      <div className="flex items-start gap-2.5 rounded-xl bg-blue-50/60 p-3.5 text-xs text-blue-900">
        <Info size={16} className="shrink-0 text-[#0878E8] mt-0.5" />
        <p>
          Statements can be generated for any date range between account opening date and today.
          You will have the option to verify your criteria before downloading.
        </p>
      </div>

      {/* Primary Action Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isContinueDisabled}
          className="inline-flex items-center justify-center rounded-xl bg-[#0878E8] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#0878E8] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </form>
  );
};
