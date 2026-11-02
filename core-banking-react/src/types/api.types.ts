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
  roleId?: number;
  roleCode?: string;
  roleName?: string;
}

export interface StaffCreateRequest {
  staffNo?: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: number;
}

export interface StaffRoleOption {
  roleId: number;
  roleCode: string;
  roleName: string;
  description?: string;
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
  active?: boolean;
  isActive?: boolean;
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
  active?: boolean;
  isActive?: boolean;
  isDeleted: boolean;
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
  customerType: 'PERSONAL' | 'COMPANY';
  email: string;
  phone: string;
  address?: string;
  // Personal
  firstName?: string;
  lastName?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string;
  nrc?: string;
  occupation?: string;
  // Company
  companyName?: string;
  registrationNumber?: string;
  taxId?: string;
  businessType?: string;
}

export interface CustomerCreateResponse extends CustomerResponse {
  temporaryPassword?: string;
}

// --- Account DTOs ---

export interface AccountResponse {
  accountNumber: string;
  accountType: string;
  accountCategory: string;
  isJointAccount: boolean;
  customerCode: string;
  customerName: string;
  nrc?: string;
  phone?: string;
  profileImageUrl?: string;
  currentBalance: number;
  availableBalance: number;
  currency: string;
  status: string;
  openedAt: string;
}

export interface AccountCreateDTO {
  customerCode: string;
  accountType: 'SAVINGS' | 'CURRENT' | string;
  currency: string;
  initialDeposit?: number;
  isJointAccount?: boolean;
}

export interface CorporateAccountCreateDTO {
  companyCustomerCode: string;
  accountType: 'CURRENT' | 'SAVINGS' | string;
  ceoCustomerCode?: string;
  accountantCustomerCode?: string;
  makerCustomerCode?: string;
  ceoFullName?: string;
  ceoEmail?: string;
  ceoPhone?: string;
  makerFullName?: string;
  makerEmail?: string;
  makerPhone?: string;
  initialDeposit?: number;
  currency?: string;
  accountPassword?: string;
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

// --- OTC Transaction DTOs ---

export interface OtcTransactionRequestDto {
  accountNumber: string;
  amount: number;
  currency?: string;
  remark: string;
  manualReferenceId: string;
  manualAuditNote: string;
}

export interface OtcTransactionResponseDto {
  transactionRef: string;
  transactionType: 'OTC_DEPOSIT' | 'OTC_WITHDRAWAL';
  status: string;
  accountNumber: string;
  customerCode: string;
  customerName: string;
  nrc?: string;
  phone?: string;
  profileImageUrl?: string;
  amount: number;
  serviceFee: number;
  balanceBefore: number;
  balanceAfter: number;
  currency: string;
  tellerUsername: string;
  depositorOrWithdrawerName?: string;
  description?: string;
  manualReferenceId?: string;
  manualAuditNote?: string;
  transactedAt: string;
}

// --- Teller Cash Summary DTO ---

export interface DailyCashSummaryResponse {
  tellerUsername: string;
  tellerFullName: string;
  reportDate: string;
  openingCash: number;
  totalCashIn: number;
  totalCashOut: number;
  netCashInDrawer: number;
  totalTransactions: number;
  depositCount: number;
  withdrawalCount: number;
  currency: string;
}


export interface OtcParametersResponse {
  minDepositAmount: number;
  minWithdrawalAmount: number;
  minimumBalance: number;
}
