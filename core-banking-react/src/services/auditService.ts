import axiosInstance from '../lib/axios';
import { API_ENDPOINTS } from '../config/api.config';
import type { AuditLogItem, AuditSearchParams, PageResponse } from '../types/audit.types';

export const auditApi = {
  search: async (params: AuditSearchParams = {}): Promise<PageResponse<AuditLogItem>> => {
    // Filter out undefined or empty string values
    const cleanParams: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanParams[key] = value;
      }
    }

    const response = await axiosInstance.get<PageResponse<AuditLogItem>>(
      API_ENDPOINTS.AUDIT_LOGS.BASE,
      { params: cleanParams }
    );
    return response.data;
  },

  getById: async (auditId: number | string): Promise<AuditLogItem> => {
    const response = await axiosInstance.get<AuditLogItem>(
      API_ENDPOINTS.AUDIT_LOGS.BY_ID(auditId)
    );
    return response.data;
  },
};
