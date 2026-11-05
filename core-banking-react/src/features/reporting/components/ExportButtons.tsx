import React from 'react';

interface ExportButtonsProps {
  onExportCsv: () => void;
  onExportExcel: () => void;
  onExportPdf?: () => void;
  loading?: boolean;
}

const btn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 14px',
  borderRadius: '6px',
  border: 'none',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

const ExportButtons: React.FC<ExportButtonsProps> = ({
  onExportCsv,
  onExportExcel,
  onExportPdf,
  loading,
}) => (
  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
    <button
      type="button"
      style={{ ...btn, backgroundColor: '#16a34a', color: '#fff', opacity: loading ? 0.6 : 1 }}
      onClick={onExportCsv}
      disabled={loading}
      title="Download CSV"
    >
      CSV
    </button>
    <button
      type="button"
      style={{ ...btn, backgroundColor: '#1D6F42', color: '#fff', opacity: loading ? 0.6 : 1 }}
      onClick={onExportExcel}
      disabled={loading}
      title="Download Excel"
    >
      Excel
    </button>
    {onExportPdf && (
      <button
        type="button"
        style={{ ...btn, backgroundColor: '#dc2626', color: '#fff', opacity: loading ? 0.6 : 1 }}
        onClick={onExportPdf}
        disabled={loading}
        title="Download PDF"
      >
        PDF
      </button>
    )}
  </div>
);

export default ExportButtons;
