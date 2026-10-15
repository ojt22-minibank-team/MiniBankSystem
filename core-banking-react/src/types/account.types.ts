export type AccountType = 'SAVINGS' | 'CURRENT' | 'FIXED_DEPOSIT' | 'SALARY';
export type Currency = 'MMK' | 'USD';
export type AccountStatus = 'ACTIVE' | 'FROZEN' | 'SUSPENDED' | 'CLOSED' | 'DORMANT';

export interface AccountCreateDTO {
  customerCode: string;
  accountType: 'SAVINGS' | 'CURRENT' | string;
  currency: 'MMK' | 'USD' | string;
  initialDeposit: number;
  accountCategory?: 'RETAIL' | 'CORPORATE';
  isJointAccount?: boolean;
}

export interface CorporateAccountCreateDTO {
  companyCustomerCode: string;
  ceoCustomerCode: string;
  accountantCustomerCode: string;
  accountType: 'SAVINGS' | 'CURRENT' | string;
  currency: 'MMK' | 'USD' | string;
  initialDeposit: number;
  accountPassword?: string;
}

export interface DepositRequestDTO {
  accountNumber?: string;
  customerCode?: string;
  amount: number;
  remarks?: string;
}

export interface AccountStatusUpdateDTO {
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED' | 'SUSPENDED';
  reason: string;
}

export interface AccountResponseDTO {
  accountNumber: string;
  accountType: string;
  accountCategory?: string;
  isJointAccount?: boolean;
  customerCode: string;
  customerName?: string;
  currentBalance: number;
  availableBalance?: number;
  currency: string;
  status: AccountStatus | string;
  openedAt?: string;
}
