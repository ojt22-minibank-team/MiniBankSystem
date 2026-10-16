// ============================================================
// Core Banking API Type Definitions
// Mirrors Spring Boot DTOs and backend entities
// ============================================================

// --- Auth DTOs ---

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

export interface CoreApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface StaffPasswordSetupRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// --- Staff DTOs ---

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
  newPassword?: string;
}

// --- System Rules DTOs ---

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

// --- Announcements DTOs ---

export type AnnouncementAudience = 'ALL' | 'CUSTOMER' | 'STAFF';

export interface AnnouncementResponse {
  announcementId: number;
  title: string;
  message: string;
  audience: AnnouncementAudience;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdByStaffId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementCreateRequest {
  title: string;
  message: string;
  audience: AnnouncementAudience;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface AnnouncementUpdateRequest {
  title?: string;
  message?: string;
  audience?: AnnouncementAudience;
  startsAt?: string | null;
  endsAt?: string | null;
}

// --- Customer DTOs ---

export interface CustomerResponse {
  customerCode: string;
  customerType: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
}

export interface CustomerDetailResponse extends CustomerResponse {
  updatedAt: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  nrc?: string;
  address?: string;
  occupation?: string;
  companyName?: string;
  registrationNumber?: string;
  taxId?: string;
  businessType?: string;
  country?: string;
}

export interface CustomerCreateDTO {
  customerType: 'INDIVIDUAL' | 'CORPORATE';
  email: string;
  phone: string;
  fullName: string;
  nrc?: string;
  dateOfBirth?: string;
  address?: string;
  companyName?: string;
  registrationNumber?: string;
}

// --- Account DTOs ---

export interface AccountResponse {
  accountNumber: string;
  accountType: string;
  accountCategory: string;
  isJointAccount: boolean;
  customerCode: string;
  customerName: string;
  currentBalance: number;
  availableBalance: number;
  currency: string;
  status: string;
  openedAt: string;
}

export interface AccountCreateDTO {
  customerCode: string;
  accountType: string;
  currency: string;
  initialDeposit?: number;
}

export interface AccountStatusUpdateDTO {
  status: string;
  reason?: string;
}

// --- Transfer DTOs ---

export interface P2PTransferRequestDto {
  sourceAccountNumber: string;
  destinationAccountNumber: string;
  amount: number;
  remark?: string;
  idempotencyKey?: string;
}

export interface P2PTransferResponseDto {
  transactionReference: string;
  sourceAccountNumber: string;
  destinationAccountNumber: string;
  amount: number;
  fee: number;
  totalDebited: number;
  status: string;
  transactedAt: string;
  remark?: string;
}

// --- Generic API error shape from Spring Boot ---

export interface ApiError {
  status: number;
  message: string;
  timestamp?: string;
  path?: string;
}
