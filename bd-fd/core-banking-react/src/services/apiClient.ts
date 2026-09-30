import axiosInstance from '../lib/axios';
import { API_ENDPOINTS } from '../config/api.config';
import type {
  LoginRequest,
  LoginResponse,
  StaffResponse,
  StaffCreateRequest,
  StaffUpdateRequest,
  ChangeStaffRoleRequest,
  PasswordResetRequest,
  SystemParameterResponse,
  SystemParameterCreateRequest,
  SystemParameterUpdateRequest,
  FeeScheduleResponse,
  FeeScheduleCreateRequest,
  FeeScheduleUpdateRequest,
  AnnouncementResponse,
  AnnouncementCreateRequest,
  AnnouncementUpdateRequest,
  CustomerResponse,
  AccountResponse,
} from '../types/api.types';

// ============================================================
// Auth API
// ============================================================

export const authApi = {
  login: (data: LoginRequest) =>
    axiosInstance.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, data),

  logout: (refreshToken: string) =>
    axiosInstance.post<string>(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken }),

  refresh: (refreshToken: string) =>
    axiosInstance.post<LoginResponse>(API_ENDPOINTS.AUTH.REFRESH, { refreshToken }),
};

// ============================================================
// Admin — Staff Management API
// ============================================================

export const staffApi = {
  getAll: () =>
    axiosInstance.get<StaffResponse[]>(API_ENDPOINTS.ADMIN.STAFF),

  getById: (staffId: string) =>
    axiosInstance.get<StaffResponse>(API_ENDPOINTS.ADMIN.STAFF_BY_ID(staffId)),

  create: (data: StaffCreateRequest) =>
    axiosInstance.post<StaffResponse>(API_ENDPOINTS.ADMIN.STAFF, data),

  update: (staffId: string, data: StaffUpdateRequest) =>
    axiosInstance.put<StaffResponse>(API_ENDPOINTS.ADMIN.STAFF_BY_ID(staffId), data),

  changeRole: (staffId: string, data: ChangeStaffRoleRequest) =>
    axiosInstance.put<StaffResponse>(API_ENDPOINTS.ADMIN.STAFF_ROLE(staffId), data),

  deactivate: (staffId: string) =>
    axiosInstance.patch<StaffResponse>(API_ENDPOINTS.ADMIN.STAFF_DEACTIVATE(staffId)),

  resetPassword: (staffId: string, data: PasswordResetRequest) =>
    axiosInstance.post<string>(API_ENDPOINTS.ADMIN.STAFF_RESET_PASSWORD(staffId), data),
};

// ============================================================
// Admin — System Rules Configuration API
// ============================================================

export const systemRulesApi = {
  // Parameters
  getAllParameters: () =>
    axiosInstance.get<SystemParameterResponse[]>(
      API_ENDPOINTS.ADMIN.SYSTEM_RULES.PARAMETERS,
    ),

  getParameterByKey: (key: string) =>
    axiosInstance.get<SystemParameterResponse>(
      API_ENDPOINTS.ADMIN.SYSTEM_RULES.PARAMETER_BY_KEY(key),
    ),

  createParameter: (data: SystemParameterCreateRequest) =>
    axiosInstance.post<SystemParameterResponse>(
      API_ENDPOINTS.ADMIN.SYSTEM_RULES.PARAMETERS,
      data,
    ),

  updateParameter: (key: string, data: SystemParameterUpdateRequest) =>
    axiosInstance.put<SystemParameterResponse>(
      API_ENDPOINTS.ADMIN.SYSTEM_RULES.PARAMETER_BY_KEY(key),
      data,
    ),

  // Fee Schedules
  getAllFees: () =>
    axiosInstance.get<FeeScheduleResponse[]>(
      API_ENDPOINTS.ADMIN.SYSTEM_RULES.FEES,
    ),

  getFeeById: (feeScheduleId: number) =>
    axiosInstance.get<FeeScheduleResponse>(
      API_ENDPOINTS.ADMIN.SYSTEM_RULES.FEE_BY_ID(feeScheduleId),
    ),

  createFee: (data: FeeScheduleCreateRequest) =>
    axiosInstance.post<FeeScheduleResponse>(
      API_ENDPOINTS.ADMIN.SYSTEM_RULES.FEES,
      data,
    ),

  updateFee: (feeScheduleId: number, data: FeeScheduleUpdateRequest) =>
    axiosInstance.put<FeeScheduleResponse>(
      API_ENDPOINTS.ADMIN.SYSTEM_RULES.FEE_BY_ID(feeScheduleId),
      data,
    ),

  activateFee: (feeScheduleId: number) =>
    axiosInstance.patch<FeeScheduleResponse>(
      API_ENDPOINTS.ADMIN.SYSTEM_RULES.FEE_ACTIVATE(feeScheduleId),
    ),

  deactivateFee: (feeScheduleId: number) =>
    axiosInstance.patch<FeeScheduleResponse>(
      API_ENDPOINTS.ADMIN.SYSTEM_RULES.FEE_DEACTIVATE(feeScheduleId),
    ),
};

// ============================================================
// Admin — Announcements API
// ============================================================

export const announcementsApi = {
  getAll: () =>
    axiosInstance.get<AnnouncementResponse[]>(API_ENDPOINTS.ADMIN.ANNOUNCEMENTS),

  getById: (id: number) =>
    axiosInstance.get<AnnouncementResponse>(API_ENDPOINTS.ADMIN.ANNOUNCEMENT_BY_ID(id)),

  create: (data: AnnouncementCreateRequest) =>
    axiosInstance.post<AnnouncementResponse>(API_ENDPOINTS.ADMIN.ANNOUNCEMENTS, data),

  update: (id: number, data: AnnouncementUpdateRequest) =>
    axiosInstance.put<AnnouncementResponse>(API_ENDPOINTS.ADMIN.ANNOUNCEMENT_BY_ID(id), data),

  delete: (id: number) =>
    axiosInstance.delete<string>(API_ENDPOINTS.ADMIN.ANNOUNCEMENT_BY_ID(id)),

  deactivate: (id: number) =>
    axiosInstance.patch<AnnouncementResponse>(API_ENDPOINTS.ADMIN.ANNOUNCEMENT_DEACTIVATE(id)),
};

// ============================================================
// Customers API (public — no auth required by backend)
// ============================================================

export const customersApi = {
  getAll: () =>
    axiosInstance.get<CustomerResponse[]>(API_ENDPOINTS.CUSTOMERS),

  getByCode: (code: string) =>
    axiosInstance.get<CustomerResponse>(API_ENDPOINTS.CUSTOMER_BY_CODE(code)),
};

// ============================================================
// Accounts API
// ============================================================

export const accountsApi = {
  getByNumber: (accountNumber: string) =>
    axiosInstance.get<AccountResponse>(API_ENDPOINTS.ACCOUNT_BY_NUMBER(accountNumber)),

  getByCustomer: (customerCode: string) =>
    axiosInstance.get<AccountResponse[]>(API_ENDPOINTS.ACCOUNTS_BY_CUSTOMER(customerCode)),
};
