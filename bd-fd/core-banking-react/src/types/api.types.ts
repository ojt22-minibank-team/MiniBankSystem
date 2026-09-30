// ============================================================
// Auth DTOs — mirrors Backend CoreLoginRequest / CoreLoginResponse / CoreRefreshRequest
// ============================================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  username: string;
  roles: string[];
  permissions: string[];
}

export interface RefreshRequest {
  refreshToken: string;
}

// ============================================================
// Staff — mirrors Backend StaffResponse / Request DTOs
// ============================================================

export type StaffUserStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface StaffResponse {
  staffId: string;
  staffNo: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  mustChangePassword: boolean;
  status: StaffUserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffCreateRequest {
  staffNo: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  roleId: number;
}

export interface StaffUpdateRequest {
  fullName: string;
  email: string;
  phone: string;
}

export interface ChangeStaffRoleRequest {
  roleId: number;
}

export interface PasswordResetRequest {
  newPassword: string;
}

// ============================================================
// System Rules — mirrors Backend SystemParameters & FeeSchedules DTOs
// ============================================================

export interface SystemParameterResponse {
  parameterId: number;
  parameterKey: string;
  parameterValue: string;
  description: string;
  updatedById: string | null;
  updatedByType: string | null;
  updatedAt: string;
}

export interface SystemParameterCreateRequest {
  parameterKey: string;
  parameterValue: string;
  description?: string;
}

export interface SystemParameterUpdateRequest {
  parameterValue: string;
  description?: string;
}

export type TransactionType =
  | 'INTERNAL_TRANSFER'
  | 'OTC_DEPOSIT'
  | 'OTC_WITHDRAWAL'
  | 'EXTERNAL_PAYMENT'
  | 'LEDGER_ADJUSTMENT'
  | 'REFUND';

export type FeeType = 'FLAT' | 'PERCENTAGE';

export interface FeeScheduleResponse {
  feeScheduleId: number;
  feeCode: string;
  transactionType: TransactionType;
  feeType: FeeType;
  feeValue: number;
  minimumFee: number | null;
  maximumFee: number | null;
  currency: string;
  activeFrom: string;
  activeUntil: string | null;
  active: boolean;
  createdByStaffId: string | null;
  createdAt: string;
  updatedById: string | null;
  updatedByType: string | null;
  updatedAt: string;
}

export interface FeeScheduleCreateRequest {
  feeCode: string;
  transactionType: TransactionType;
  feeType: FeeType;
  feeValue: number;
  minimumFee?: number | null;
  maximumFee?: number | null;
  currency: string;
  activeFrom: string;
  activeUntil?: string | null;
}

export interface FeeScheduleUpdateRequest {
  transactionType: TransactionType;
  feeType: FeeType;
  feeValue: number;
  minimumFee?: number | null;
  maximumFee?: number | null;
  currency?: string;
  activeFrom: string;
  activeUntil?: string | null;
}

// ============================================================
// Announcements — mirrors Backend AnnouncementResponse DTO
// ============================================================

export interface AnnouncementResponse {
  id: number;
  title: string;
  content: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface AnnouncementCreateRequest {
  title: string;
  content: string;
}

export interface AnnouncementUpdateRequest {
  title?: string;
  content?: string;
}

// ============================================================
// Customer — mirrors Backend CustomerResponseDTO
// ============================================================

export interface CustomerResponse {
  customerCode: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  address: string | null;
  status: string;
  createdAt: string;
}

// ============================================================
// Account — mirrors Backend AccountResponseDTO
// ============================================================

export interface AccountResponse {
  accountNumber: string;
  accountType: string;
  balance: number;
  currency: string;
  status: string;
  customerCode: string;
  createdAt: string;
}

// ============================================================
// Generic API error shape from Spring Boot
// ============================================================

export interface ApiError {
  status: number;
  message: string;
  timestamp?: string;
  path?: string;
}
