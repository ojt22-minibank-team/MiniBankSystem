import { useState, useRef, useEffect, useCallback } from 'react';
import { startAsyncReportExport, checkExportJobStatus, downloadExportJobFile } from '../../../services/reportingService';
import type { ExportJobResponse } from '../../../types/reports/reporting.types';

export function useAsyncExport(
  reportType: 'DAILY_LEDGER' | 'ACCOUNT_STATUS' | 'AUDIT_TRAIL' | 'FEE_REVENUE' | 'LARGE_TRANSACTIONS' | 'TRANSACTION_DETAIL'
) {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<ExportJobResponse | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const clearNotice = useCallback(() => {
    clearAllTimers();
    setExportLoading(false);
    setExportNotice(null);
    setExportError(null);
    setActiveJob(null);
  }, [clearAllTimers]);

  const triggerExport = useCallback(async (params: Record<string, any>, format: 'csv' | 'excel' | 'pdf') => {
    clearAllTimers();

    setExportLoading(true);
    setExportError(null);
    const formatLabel = format.toUpperCase();
    setExportNotice(`🚀 Initializing background export for ${formatLabel}...`);

    try {
      const job = await startAsyncReportExport(reportType, params, format);
      setActiveJob(job);
      setExportNotice(
        `⏳ Background job started [${job.jobId}]. Generating ${formatLabel} file. You can freely continue browsing.`
      );

      let attempts = 0;
      const MAX_ATTEMPTS = 120; // 120 * 1.5s = 180 seconds fail-safe limit

      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        try {
          const status = await checkExportJobStatus(job.jobId);
          setActiveJob(status);

          if (status.status === 'COMPLETED') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setExportLoading(false);
            setExportNotice(`🎉 Your ${formatLabel} Report is ready! Starting download...`);

            try {
              await downloadExportJobFile(status.jobId, status.fileName);
              setExportNotice(`✅ ${formatLabel} download complete!`);
            } catch (dlErr: unknown) {
              setExportError((dlErr as Error).message || `Download failed for ${formatLabel}`);
              setExportNotice(null);
            }

            dismissTimeoutRef.current = setTimeout(() => {
              setExportNotice(null);
              setActiveJob(null);
            }, 6000);

          } else if (status.status === 'FAILED') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setExportLoading(false);
            setExportError(status.errorMessage || `Failed to export ${formatLabel}`);
            setExportNotice(null);
            setActiveJob(null);

          } else if (attempts >= MAX_ATTEMPTS) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setExportLoading(false);
            setExportError('Export job timed out. Please try filtering a smaller date range.');
            setExportNotice(null);
          }
        } catch (pollErr: unknown) {
          if (attempts >= MAX_ATTEMPTS) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setExportLoading(false);
            setExportError((pollErr as Error).message || 'Connection lost while checking export status');
            setExportNotice(null);
          }
        }
      }, 1500);

    } catch (err: unknown) {
      clearAllTimers();
      setExportError((err as Error).message || `Failed to start ${format} export`);
      setExportNotice(null);
      setExportLoading(false);
      setActiveJob(null);
    }
  }, [reportType, clearAllTimers]);

  return {
    exportLoading,
    exportNotice,
    activeJob,
    exportError,
    triggerExport,
    clearNotice,
  };
}
