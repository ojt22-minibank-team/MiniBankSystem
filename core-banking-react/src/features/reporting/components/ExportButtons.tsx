import React from 'react';

interface ExportButtonsProps {
  onExportCsv: () => void;
  onExportExcel: () => void;
  onExportPdf?: () => void;
  loading?: boolean;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({
  onExportCsv,
  onExportExcel,
  onExportPdf,
  loading,
}) => (
  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
    <button
      type="button"
      className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
      onClick={onExportCsv}
      disabled={loading}
      title="Download CSV"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      CSV
    </button>
    <button
      type="button"
      className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-700 hover:bg-green-800 transition-colors shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
      onClick={onExportExcel}
      disabled={loading}
      title="Download Excel"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      Excel
    </button>
    {onExportPdf && (
      <button
        type="button"
        className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
        onClick={onExportPdf}
        disabled={loading}
        title="Download PDF"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        PDF
      </button>
    )}
  </div>
);

export default ExportButtons;
