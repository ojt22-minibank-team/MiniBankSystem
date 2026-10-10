import React, { useState, useEffect, useCallback } from 'react';
import type {
  AuditTrailLog,
  AuditTrailPage,
  AuditFilterParams,
} from '../../../types/reports/reporting.types';
import {
  fetchAuditTrailLogs,
  exportAuditTrail,
} from '../../../services/reportingService';
import DataTable, { type Column } from './DataTable';
import ExportButtons from './ExportButtons';
import MetricCard from './MetricCard';

interface Props {
  staffId: string;
  actionType: string;
  auditStartDate: string;
  auditEndDate: string;
  accountNo: string;
  searchKey?: number;
}

const ACTION_BADGE_COLOR: Record<string, string> = {
  LOGIN: '#2563EB',
  LOGOUT: '#64748b',
  CREATE_ACCOUNT: '#16a34a',
  UPDATE_ACCOUNT: '#d97706',
  FREEZE_ACCOUNT: '#0891b2',
  SUSPEND_ACCOUNT: '#dc2626',
  CREATE_CUSTOMER: '#7c3aed',
  APPROVE_KYC: '#16a34a',
  REJECT_KYC: '#dc2626',
  TRANSFER: '#1E40AF',
};

const AuditTrailPanel: React.FC<Props> = ({
  staffId,
  actionType,
  auditStartDate,
  auditEndDate,
  accountNo,
  searchKey,
}) => {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [pageData, setPageData] = useState<AuditTrailPage>({
    logs: [],
    totalCount: 0,
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params: AuditFilterParams = {
    staffId,
    actionType,
    startDate: auditStartDate,
    endDate: auditEndDate,
    accountNo,
    page,
    pageSize: PAGE_SIZE,
  };

  const load = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchAuditTrailLogs({
          staffId,
          actionType,
          startDate: auditStartDate,
          endDate: auditEndDate,
          accountNo,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });
        setPageData(result);
        setPage(targetPage);
      } catch (e: unknown) {
        setError((e as Error).message || 'Failed to load audit trail');
      } finally {
        setLoading(false);
      }
    },
    [staffId, actionType, auditStartDate, auditEndDate, accountNo]
  );

  useEffect(() => {
    load(1);
  }, [load, searchKey]);

  const handlePageChange = (p: number) => load(p);

  const columns: Column<AuditTrailLog>[] = [
    {
      key: 'createdAt',
      label: 'Timestamp',
      render: (r: AuditTrailLog) => (
        <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>
          {r.createdAt?.replace('T', ' ')}
        </span>
      ),
    },
    {
      key: 'staffUsername',
      label: 'Staff',
      render: (r: AuditTrailLog) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1E40AF', fontSize: '12px' }}>
            {r.staffUsername || r.staffId}
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>{r.staffFullName}</div>
        </div>
      ),
    },
    {
      key: 'actionType',
      label: 'Action',
      render: (r: AuditTrailLog) => (
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: 700,
            backgroundColor: (ACTION_BADGE_COLOR[r.actionType] ?? '#94a3b8') + '22',
            color: ACTION_BADGE_COLOR[r.actionType] ?? '#64748b',
            whiteSpace: 'nowrap',
          }}
        >
          {r.actionType}
        </span>
      ),
    },
    { key: 'entityType', label: 'Entity Type' },
    { key: 'entityId', label: 'Entity / Account' },
    {
      key: 'ipAddress',
      label: 'IP Address',
      render: (r: AuditTrailLog) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{r.ipAddress}</span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (r: AuditTrailLog) => (
        <span
          style={{
            fontSize: '12px',
            color: '#475569',
            maxWidth: '200px',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={r.description}
        >
          {r.description}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <MetricCard
          icon="Logs"
          label="Total Log Entries"
          value={pageData.totalCount.toLocaleString()}
          sub="Matching filters"
          color="#1E40AF"
        />
        <MetricCard
          icon="Pages"
          label="Current Page"
          value={`${pageData.page} / ${pageData.totalPages || 1}`}
          sub={`${PAGE_SIZE} rows/page`}
          color="#2563EB"
        />
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              System Audit Trail Logs
            </span>
            {pageData.totalCount > 0 && (
              <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px' }}>
                {pageData.totalCount.toLocaleString()} total entries
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <ExportButtons
              onExportCsv={() => exportAuditTrail({ ...params, pageSize: 1000 }, 'csv')}
              onExportExcel={() => exportAuditTrail({ ...params, pageSize: 1000 }, 'excel')}
              onExportPdf={() => exportAuditTrail({ ...params, pageSize: 1000 }, 'pdf')}
              loading={loading}
            />
            <button
              onClick={() => load(1)}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563EB',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Loading...' : 'Load Logs'}
            </button>
          </div>
        </div>
        {error && (
          <div
            style={{
              padding: '12px 20px',
              color: '#dc2626',
              fontSize: '13px',
              backgroundColor: '#fef2f2',
            }}
          >
            Error: {error}
          </div>
        )}
        <div style={{ padding: '16px 20px' }}>
          <DataTable
            columns={columns}
            data={pageData.logs}
            loading={loading}
            emptyMessage="No audit trail entries found matching the criteria."
            page={pageData.page}
            totalPages={pageData.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default AuditTrailPanel;
