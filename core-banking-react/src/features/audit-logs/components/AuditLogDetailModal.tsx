import { useState } from 'react';
import type { AuditLogItem } from '../../../types/audit.types';

interface AuditLogDetailModalProps {
  log: AuditLogItem | null;
  onClose: () => void;
}

export default function AuditLogDetailModal({ log, onClose }: AuditLogDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!log) return null;

  const formatJson = (value: string | null | undefined) => {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  };

  const formattedOld = formatJson(log.oldValues);
  const formattedNew = formatJson(log.newValues);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getActorBadgeColor = (type: string) => {
    switch (type) {
      case 'STAFF':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CUSTOMER':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SYSTEM':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'CORPORATE_USER':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm shadow-sm">
              #{log.auditId}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {log.actionType}
                </h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getActorBadgeColor(
                    log.actorType
                  )}`}
                >
                  {log.actorType}
                </span>
                {log.actionCategory && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-700">
                    {log.actionCategory}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Timestamp: {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyJson}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? 'Copied!' : 'Copy JSON'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description banner */}
          {log.description && (
            <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-100 flex items-start gap-2.5">
              <svg className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-blue-900">Event Description</p>
                <p className="text-sm text-blue-800 mt-0.5">{log.description}</p>
              </div>
            </div>
          )}

          {/* Grid of Key Properties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase">Actor Identifier</p>
              <p className="text-sm font-medium text-slate-900 mt-1 truncate">
                {log.actorStaffUsername
                  ? `${log.actorStaffUsername} (${log.actorStaffId || 'Staff'})`
                  : log.actorCustomerId
                  ? `Customer: ${log.actorCustomerId}`
                  : log.actorType || 'SYSTEM'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase">Target Entity</p>
              <p className="text-sm font-medium text-slate-900 mt-1 truncate">
                <span className="font-semibold text-blue-600">{log.entityType || 'N/A'}</span>
                {log.entityId && ` (${log.entityId})`}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase">Client IP Address</p>
              <p className="text-sm font-mono text-slate-900 mt-1 truncate">
                {log.ipAddress || 'Internal / Not Recorded'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">Request URL</p>
              <p className="text-xs font-mono text-slate-800 mt-1 break-all">
                {log.requestUrl || '-'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase">Request ID</p>
              <p className="text-xs font-mono text-slate-800 mt-1 truncate">
                {log.requestId || '-'}
              </p>
            </div>

            {log.userAgent && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-3">
                <p className="text-xs font-semibold text-slate-500 uppercase">User Agent / Client</p>
                <p className="text-xs text-slate-700 mt-1 break-all">
                  {log.userAgent}
                </p>
              </div>
            )}
          </div>

          {/* State Transition Diff: Old Values vs New Values */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              State Transition (Entity Values)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Old Values */}
              <div className="flex flex-col rounded-xl border border-red-200 bg-red-50/30 overflow-hidden">
                <div className="px-3.5 py-2 bg-red-100/60 border-b border-red-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-red-900">Before Change (Old Values)</span>
                  <span className="text-[10px] text-red-600 uppercase font-semibold">Previous State</span>
                </div>
                <div className="p-3 flex-1 overflow-x-auto max-h-64">
                  {formattedOld ? (
                    <pre className="text-xs font-mono text-red-950 whitespace-pre-wrap leading-relaxed">
                      {formattedOld}
                    </pre>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No previous state recorded (Initial creation)</span>
                  )}
                </div>
              </div>

              {/* New Values */}
              <div className="flex flex-col rounded-xl border border-emerald-200 bg-emerald-50/30 overflow-hidden">
                <div className="px-3.5 py-2 bg-emerald-100/60 border-b border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">After Change (New Values)</span>
                  <span className="text-[10px] text-emerald-600 uppercase font-semibold">Updated State</span>
                </div>
                <div className="p-3 flex-1 overflow-x-auto max-h-64">
                  {formattedNew ? (
                    <pre className="text-xs font-mono text-emerald-950 whitespace-pre-wrap leading-relaxed">
                      {formattedNew}
                    </pre>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No state changes recorded or entity deleted</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors shadow-sm"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
