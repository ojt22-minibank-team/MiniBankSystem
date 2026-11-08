
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  FileDown,
  FileSpreadsheet,
  RotateCcw,
  Wallet,
  Calendar,
  AlertCircle,
  X,
  Loader2,
  Download,
} from "lucide-react";
import type { CustomerAccount } from "../../accounts/types/accountTypes";
import type { StatementFilterForm } from "../types/statementTypes";
import { isoToDisplay } from "../types/statementTypes";
import {
  downloadAccountStatementPdf,
  downloadAccountStatementCsv,
  parseBlobErrorMessage,
} from "../services/statementService";

interface StatementDownloadProps {
  confirmedForm: StatementFilterForm | null;
  account?: CustomerAccount | null;
  onChangeDetails: () => void;
}

export const StatementDownload: FC<StatementDownloadProps> = ({
  confirmedForm,
  account,
  onChangeDetails,
}) => {
  const { t } = useTranslation("statement");

  const [downloadingFormat, setDownloadingFormat] = useState<"pdf" | "csv" | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (!confirmedForm) {
    return null;
  }

  const isPdfLoading = downloadingFormat === "pdf";
  const isCsvLoading = downloadingFormat === "csv";
  const isAnyDownloading = downloadingFormat !== null;

  const handleDownloadPdf = async () => {
    if (!confirmedForm || isAnyDownloading) return;
    setDownloadingFormat("pdf");
    setDownloadError(null);

    try {
      await downloadAccountStatementPdf({
        accountNumber: confirmedForm.accountNumber,
        fromDate: confirmedForm.fromDate,
        toDate: confirmedForm.toDate,
      });
    } catch (err) {
      const message = await parseBlobErrorMessage(
        err,
        t("download.errors.pdf")
      );
      setDownloadError(message);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleDownloadCsv = async () => {
    if (!confirmedForm || isAnyDownloading) return;
    setDownloadingFormat("csv");
    setDownloadError(null);

    try {
      await downloadAccountStatementCsv({
        accountNumber: confirmedForm.accountNumber,
        fromDate: confirmedForm.fromDate,
        toDate: confirmedForm.toDate,
      });
    } catch (err) {
      const message = await parseBlobErrorMessage(
        err,
        t("download.errors.csv")
      );
      setDownloadError(message);
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
      {/* Header with success badge */}
      <div className="mb-6 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={18} />
          </div>
          <h2 className="text-base font-bold text-[#0A192F] dark:text-white">
            {t("download.ready.title")}
          </h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {t("download.ready.description")}
        </p>
      </div>

      {/* Confirmed Snapshot Overview */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Wallet size={13} className="text-[#00A3C4]" />
              {t("download.account")}
            </span>
            <span className="text-sm font-bold text-slate-900 mt-1 block">
              {confirmedForm.accountNumber}
            </span>
            <span className="text-xs text-slate-500">
              {confirmedForm.accountType} {account?.currency ? `(${account.currency})` : ""}
            </span>
          </div>

          <div>
            <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Calendar size={13} className="text-[#00A3C4]" />
              {t("form.fromDate")}
            </span>
            <span className="text-sm font-bold text-slate-900 mt-1 block">
              {isoToDisplay(confirmedForm.fromDate)}
            </span>
            <span className="text-[11px] text-slate-400">
              {t("form.dateFormat")}
            </span>
          </div>

          <div>
            <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Calendar size={13} className="text-[#00A3C4]" />
              {t("form.toDate")}
            </span>
            <span className="text-sm font-bold text-slate-900 mt-1 block">
              {isoToDisplay(confirmedForm.toDate)}
            </span>
            <span className="text-[11px] text-slate-400">
              {t("form.dateFormat")}
            </span>
          </div>
        </div>
      </div>

      {/* Download Error Alert */}
      {downloadError && (
        <div
          role="alert"
          className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 animate-in fade-in duration-150"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-red-800">
                {t("download.errors.title")}
              </p>
              <p className="text-sm font-medium text-red-900 mt-0.5">
                {downloadError}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDownloadError(null)}
            className="shrink-0 p-1 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
            aria-label={t("download.errors.dismiss")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Download Options */}
      <div className="mb-6 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          {t("download.exportFormats")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* PDF Download Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isAnyDownloading}
            className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
              isPdfLoading
                ? "border-cyan-300 bg-cyan-50/50 shadow-sm cursor-wait"
                : isAnyDownloading
                ? "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
                : "border-slate-200 bg-white hover:border-[#00A3C4] hover:shadow-md cursor-pointer group"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isPdfLoading
                    ? "bg-cyan-100 text-[#00A3C4]"
                    : "bg-red-50 text-red-600 group-hover:bg-red-100"
                }`}
              >
                {isPdfLoading ? <Loader2 size={20} className="animate-spin" /> : <FileDown size={20} />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {isPdfLoading
                    ? t("download.pdf.downloading")
                    : t("download.pdf.title")}
                </p>
                <p className="text-xs text-slate-400">
                  {t("download.pdf.description")}
                </p>
              </div>
            </div>
            <div className="text-[#00A3C4] opacity-80 group-hover:opacity-100">
              {isPdfLoading ? (
                <span className="text-xs font-semibold text-[#00A3C4]">
                  {t("download.preparing")}
                </span>
              ) : (
                <Download size={18} />
              )}
            </div>
          </button>

          {/* CSV Download Button */}
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={isAnyDownloading}
            className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
              isCsvLoading
                ? "border-emerald-300 bg-emerald-50/50 shadow-sm cursor-wait"
                : isAnyDownloading
                ? "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
                : "border-slate-200 bg-white hover:border-emerald-600 hover:shadow-md cursor-pointer group"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isCsvLoading
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
                }`}
              >
                {isCsvLoading ? <Loader2 size={20} className="animate-spin" /> : <FileSpreadsheet size={20} />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {isCsvLoading
                    ? t("download.csv.downloading")
                    : t("download.csv.title")}
                </p>
                <p className="text-xs text-slate-400">
                  {t("download.csv.description")}
                </p>
              </div>
            </div>
            <div className="text-emerald-600 opacity-80 group-hover:opacity-100">
              {isCsvLoading ? (
                <span className="text-xs font-semibold text-emerald-700">
                  {t("download.preparing")}
                </span>
              ) : (
                <Download size={18} />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Information Tip */}
      <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-cyan-50/60 p-3.5 text-xs text-[#0A192F]">
        <CheckCircle2 size={16} className="shrink-0 text-[#00A3C4] mt-0.5" />
        <p>{t("download.informationTip")}</p>
      </div>

      {/* Action to change details and return to form */}
      <div className="flex justify-start pt-2">
        <button
          type="button"
          onClick={onChangeDetails}
          disabled={isAnyDownloading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw size={16} />
          {t("download.changeDetails")}
        </button>
      </div>
    </section>
  );
};
