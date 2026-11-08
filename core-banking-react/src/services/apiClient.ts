import axiosInstance from '../lib/axios';
import { API_ENDPOINTS } from '../config/api.config';
import type {
  LoginRequest,
  LoginResponse,
  StaffResponse,
  StaffCreateRequest,
  StaffRoleOption,
  StaffUpdateRequest,
  StaffChangePasswordRequest,
  ChangeStaffRoleRequest,
  StaffPasswordSetupRequest,
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
  CustomerDetailResponse,
  CustomerCreateDTO,
  CustomerCreateResponse,
  CustomerUpdateDTO,
  CustomerUpdateResponse,
  AccountResponse,
  AccountCreateDTO,
  CorporateAccountCreateDTO,
  AccountStatusUpdateDTO,
  P2PTransferRequestDto,
  P2PTransferResponseDto,
  OtcTransactionRequestDto,
  OtcTransactionResponseDto,
  DailyCashSummaryResponse,
  OtcParametersResponse,
  OtcAccountLimitResponse,
  AdminDashboardSummaryResponse,
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

    validatePasswordSetupToken: (token: string) =>
    axiosInstance.get<{ valid: boolean; username?: string; email?: string }>(
      API_ENDPOINTS.AUTH.STAFF_PASSWORD_SETUP_VALIDATE,
      { params: { token } },
    ),

  completePasswordSetup: (data: StaffPasswordSetupRequest) =>
    axiosInstance.post<{ message: string }>(
      API_ENDPOINTS.AUTH.STAFF_PASSWORD_SETUP_COMPLETE,
      data,
    ),
};

// ============================================================
// ============================================================
// Admin — Dashboard API
// ============================================================

export const adminDashboardApi = {
  getSummary: () =>
    axiosInstance.get<AdminDashboardSummaryResponse>(API_ENDPOINTS.ADMIN.DASHBOARD_SUMMARY),
};

// ============================================================
// Admin — Staff Management API
// ============================================================

export const staffApi = {
  getAll: (params?: { page?: number; size?: number; [key: string]: any }) =>
    axiosInstance.get<StaffResponse[]>(API_ENDPOINTS.ADMIN.STAFF, { params }),

  getRoles: () =>
    axiosInstance.get<StaffRoleOption[]>(API_ENDPOINTS.ADMIN.STAFF_ROLES),

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

  resetPassword: (staffId: string) =>
    axiosInstance.post<string>(API_ENDPOINTS.ADMIN.STAFF_RESET_PASSWORD(staffId)),

  resendSetupLink: (staffId: string) =>
    axiosInstance.post<{ message: string }>(API_ENDPOINTS.ADMIN.STAFF_RESEND_SETUP_LINK(staffId)),
};

export const staffProfileApi = {
  getMe: () =>
    axiosInstance.get<StaffResponse>(API_ENDPOINTS.STAFF_PROFILE.ME),

  updateMe: (data: StaffUpdateRequest) =>
    axiosInstance.put<StaffResponse>(API_ENDPOINTS.STAFF_PROFILE.ME, data),

  changePassword: (data: StaffChangePasswordRequest) =>
    axiosInstance.post<{ message: string }>(
      API_ENDPOINTS.STAFF_PROFILE.CHANGE_PASSWORD,
      data,
    ),
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
// Announcements API (Admin + Staff)
// ============================================================

export const announcementsApi = {
  getAll: (params?: { page?: number; size?: number; [key: string]: any }) =>
    axiosInstance.get<AnnouncementResponse[]>(API_ENDPOINTS.ADMIN.ANNOUNCEMENTS, { params }),

  getActive: () =>
    axiosInstance.get<AnnouncementResponse[]>(API_ENDPOINTS.ANNOUNCEMENTS),

  getById: (id: number) =>
    axiosInstance.get<AnnouncementResponse>(API_ENDPOINTS.ADMIN.ANNOUNCEMENT_BY_ID(id)),

  create: (data: AnnouncementCreateRequest) =>
    axiosInstance.post<AnnouncementResponse>(API_ENDPOINTS.ADMIN.ANNOUNCEMENTS, data),

  update: (id: number, data: AnnouncementUpdateRequest) =>
    axiosInstance.put<AnnouncementResponse>(API_ENDPOINTS.ADMIN.ANNOUNCEMENT_BY_ID(id), data),

  // ပြင်ဆင်ထားသော အပိုင်း (patch အစား delete ကို အသုံးပြုထားပါသည်)
  softDelete: (id: number) =>
    axiosInstance.delete(API_ENDPOINTS.ADMIN.ANNOUNCEMENT_SOFT_DELETE(id)),

  bulkSoftDeleteExpired: () =>
    axiosInstance.delete(API_ENDPOINTS.ADMIN.ANNOUNCEMENT_BULK_SOFT_DELETE_EXPIRED),

  deactivate: (id: number) =>
    axiosInstance.patch<AnnouncementResponse>(API_ENDPOINTS.ADMIN.ANNOUNCEMENT_DEACTIVATE(id)),
};
// ============================================================
// Customers API
// ============================================================

export const customersApi = {
  getAll: (params?: { page?: number; size?: number; [key: string]: any }) =>
    axiosInstance.get<CustomerResponse[]>(API_ENDPOINTS.CUSTOMERS, { params }),

  getByCode: (code: string) =>
    axiosInstance.get<CustomerDetailResponse>(API_ENDPOINTS.CUSTOMER_BY_CODE(code)),

  update: (customerCode: string, data: CustomerUpdateDTO) =>
    axiosInstance.put<CustomerUpdateResponse>(API_ENDPOINTS.CUSTOMER_BY_CODE(customerCode), data),

  create: (data: CustomerCreateDTO) =>
    axiosInstance.post<CustomerCreateResponse>(API_ENDPOINTS.CUSTOMERS, data),
};

// ============================================================
// Accounts API
// ============================================================

export const accountsApi = {
  getAll: (params?: { page?: number; size?: number; [key: string]: any }) =>
    axiosInstance.get<AccountResponse[]>(API_ENDPOINTS.ACCOUNTS, { params }),

  create: (data: AccountCreateDTO) =>
    axiosInstance.post<AccountResponse>(API_ENDPOINTS.ACCOUNTS, data),

  createCorporate: (data: CorporateAccountCreateDTO) =>
    axiosInstance.post<{ status: string; message: string; accountNumber: string }>(
      `${API_ENDPOINTS.ACCOUNTS}/corporate`,
      data,
    ),

  getByNumber: (accountNumber: string) =>
    axiosInstance.get<AccountResponse>(API_ENDPOINTS.ACCOUNT_BY_NUMBER(accountNumber)),

  getByCustomer: (customerCode: string) =>
    axiosInstance.get<AccountResponse[]>(API_ENDPOINTS.ACCOUNTS_BY_CUSTOMER(customerCode)),

  updateStatus: (accountNumber: string, data: AccountStatusUpdateDTO) =>
    axiosInstance.patch<AccountResponse>(API_ENDPOINTS.ACCOUNT_STATUS(accountNumber), data),
};

// ============================================================
// Transfers API
// ============================================================

export const transfersApi = {
  p2pTransfer: (data: P2PTransferRequestDto, idempotencyKey?: string) =>
    axiosInstance.post<P2PTransferResponseDto>(
      API_ENDPOINTS.TRANSFER_P2P,
      data,
      idempotencyKey
        ? {
            headers: {
              'Idempotency-Key': idempotencyKey,
            },
          }
        : undefined,
    ),
};

// ============================================================
// Over-the-Counter (OTC) Transactions API (Deposit & Withdraw)
// ============================================================

export const otcApi = {
  deposit: (data: OtcTransactionRequestDto, idempotencyKey?: string) =>
    axiosInstance.post<OtcTransactionResponseDto>(
      API_ENDPOINTS.OTC.DEPOSIT,
      data,
      idempotencyKey
        ? {
            headers: {
              'Idempotency-Key': idempotencyKey,
            },
          }
        : undefined,
    ),

  withdraw: (data: OtcTransactionRequestDto, idempotencyKey?: string) =>
    axiosInstance.post<OtcTransactionResponseDto>(
      API_ENDPOINTS.OTC.WITHDRAW,
      data,
      idempotencyKey
        ? {
            headers: {
              'Idempotency-Key': idempotencyKey,
            },
          }
        : undefined,
    ),

  getParameters: () =>
    axiosInstance.get<OtcParametersResponse>(API_ENDPOINTS.OTC.PARAMETERS),

  checkReference: (ref: string) =>
    axiosInstance.get<{ exists: boolean }>(API_ENDPOINTS.OTC.CHECK_REFERENCE, {
      params: { ref },
    }),

  calculateFee: (type: 'OTC_DEPOSIT' | 'OTC_WITHDRAWAL', amount: number) =>
    axiosInstance.get<{ fee: number }>(API_ENDPOINTS.OTC.CALCULATE_FEE, {
      params: { type, amount },
    }),

  getAccountLimits: (accountNumber: string) =>
    axiosInstance.get<OtcAccountLimitResponse>(API_ENDPOINTS.OTC.ACCOUNT_LIMITS, {
      params: { accountNumber },
    }),
};

// ============================================================
// Teller Daily Operations API
// ============================================================

export const tellerApi = {
  getDailyCashSummary: (scope: 'today' | 'all' = 'today') =>
    axiosInstance.get<DailyCashSummaryResponse>(API_ENDPOINTS.TELLER.DAILY_CASH_SUMMARY, {
      params: { scope },
    }),
};
