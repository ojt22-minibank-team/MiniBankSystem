import apiClient from '../lib/axios';
import type {
  AccountCreateDTO,
  CorporateAccountCreateDTO,
  AccountResponseDTO,
  DepositRequestDTO,
  AccountStatusUpdateDTO,
} from '../types/account.types';

export const accountService = {
  /**
   * 1. Get all accounts in system
   * GET /api/accounts
   */
  async getAllAccounts(): Promise<AccountResponseDTO[]> {
    const response = await apiClient.get<AccountResponseDTO[]>('/api/accounts');
    return Array.isArray(response.data) ? response.data : (response.data as any)?.content || [];
  },

  /**
   * 2. Lookup single account by account number
   * GET /api/accounts/{accountNumber}
   */
  async getAccountByNumber(accountNumber: string): Promise<AccountResponseDTO> {
    const response = await apiClient.get<AccountResponseDTO>(
      `/api/accounts/${encodeURIComponent(accountNumber)}`
    );
    return response.data;
  },

  /**
   * 3. Get all accounts belonging to a specific customer
   * GET /api/accounts/customer/{customerCode}
   */
  async getAccountsByCustomerCode(customerCode: string): Promise<AccountResponseDTO[]> {
    const response = await apiClient.get<AccountResponseDTO[]>(
      `/api/accounts/customer/${encodeURIComponent(customerCode)}`
    );
    return Array.isArray(response.data) ? response.data : (response.data as any)?.content || [];
  },

  /**
   * 4. Open Retail / Personal Account
   * POST /api/accounts
   */
  async createRetailAccount(dto: AccountCreateDTO): Promise<AccountResponseDTO> {
    const payload = {
      customerCode: dto.customerCode.trim(),
      accountType: dto.accountType,
      currency: dto.currency || 'MMK',
      initialDeposit: Number(dto.initialDeposit) || 0,
      accountCategory: dto.accountCategory || 'RETAIL',
      isJointAccount: Boolean(dto.isJointAccount),
    };

    const response = await apiClient.post<AccountResponseDTO>('/api/accounts', payload);
    return response.data;
  },

  /**
   * 5. Open Corporate Joint Account (Maker-Checker Approver CEO + Maker Accountant)
   * POST /api/accounts/corporate
   */
  async createCorporateAccount(dto: CorporateAccountCreateDTO): Promise<{
    status: string;
    message: string;
    accountNumber: string;
  }> {
    const payload = {
      companyCustomerCode: dto.companyCustomerCode.trim(),
      ceoCustomerCode: dto.ceoCustomerCode.trim(),
      accountantCustomerCode: dto.accountantCustomerCode.trim(),
      accountType: dto.accountType,
      currency: dto.currency || 'MMK',
      initialDeposit: Number(dto.initialDeposit) || 0,
      accountPassword: dto.accountPassword || undefined,
    };

    const response = await apiClient.post('/api/accounts/corporate', payload);
    return response.data;
  },

  /**
   * 6. Counter Deposit Funds
   * POST /api/accounts/deposit
   */
  async depositFunds(dto: DepositRequestDTO): Promise<AccountResponseDTO> {
    const payload: Record<string, any> = {
      amount: Number(dto.amount),
      remarks: dto.remarks?.trim() || 'Counter Cash Deposit',
    };

    if (dto.accountNumber && dto.accountNumber.trim()) {
      payload.accountNumber = dto.accountNumber.trim();
    }
    if (dto.customerCode && dto.customerCode.trim()) {
      payload.customerCode = dto.customerCode.trim();
    }

    const response = await apiClient.post<AccountResponseDTO>('/api/accounts/deposit', payload);
    return response.data;
  },

  /**
   * 7. Update Account Status (ACTIVE, FROZEN, CLOSED)
   * Primary: PUT /api/accounts/{accountNumber}/status
   * Fallback: PATCH /api/accounts/{accountNumber}/status
   */
  async updateAccountStatus(
    accountNumber: string,
    dto: AccountStatusUpdateDTO
  ): Promise<AccountResponseDTO> {
    const payload = {
      status: dto.status,
      reason: dto.reason.trim(),
    };

    try {
      const response = await apiClient.put<AccountResponseDTO>(
        `/api/accounts/${encodeURIComponent(accountNumber)}/status`,
        payload
      );
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 405) {
        const fallbackRes = await apiClient.patch<AccountResponseDTO>(
          `/api/accounts/${encodeURIComponent(accountNumber)}/status`,
          payload
        );
        return fallbackRes.data;
      }
      throw err;
    }
  },
};

export default accountService;
