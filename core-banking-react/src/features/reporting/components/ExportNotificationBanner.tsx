import React from 'react';
import type { ExportJobResponse } from '../../../types/reports/reporting.types';

interface ExportNotificationBannerProps {
  exportNotice: string | null;
  exportLoading: boolean;
  activeJob?: ExportJobResponse | null;
  exportError?: string | null;
  onDismiss: () => void;
}

export const ExportNotificationBanner: React.FC<ExportNotificationBannerProps> = ({
  exportNotice,
  exportLoading,
  activeJob,
  exportError,
  onDismiss,
}) => {
  if (!exportNotice && !exportError) return null;

  if (exportError) {
    return (
      <div className="px-4 py-3 text-xs sm:text-sm font-medium flex items-center justify-between bg-red-50 text-red-800 border-b border-red-200 animate-fadeIn">
        <div className="flex items-center gap-2">
          <span>❌ {exportError}</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-red-600 hover:text-red-900 underline font-semibold ml-2 cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 text-xs sm:text-sm font-medium flex items-center justify-between bg-blue-50/90 text-blue-800 border-b border-blue-200 animate-fadeIn">
      <div className="flex items-center gap-3">
        {exportLoading && (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        <div className="flex items-center flex-wrap gap-1">
          <span>{exportNotice}</span>
          {activeJob?.status === 'PROCESSING' && (
            <span className="ml-2 text-xs text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-full">
              {activeJob.progress}%
            </span>
          )}
        </div>
      </div>
      {!exportLoading && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-blue-600 hover:text-blue-900 underline font-semibold ml-2 cursor-pointer"
        >
          Dismiss
        </button>
      )}
    </div>
  );
};
