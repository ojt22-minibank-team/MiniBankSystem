import apiClient from '../lib/axios';
import type {
  CustomerResponseDTO,
  CustomerDetailResponseDTO,
  PersonalCustomerCreateDTO,
  CompanyCustomerCreateDTO,
  CustomerUpdateDTO,
} from '../types/customer.types';

export const customerService = {
  /**
   * 1. Get all registered customers
   * GET /api/customers
   */
  async getAllCustomers(): Promise<CustomerResponseDTO[]> {
    const response = await apiClient.get<CustomerResponseDTO[]>('/api/customers');
    return Array.isArray(response.data) ? response.data : (response.data as any)?.content || [];
  },

  /**
   * 2. Get customer details by unique customer code
   * GET /api/customers/{customerCode}
   */
  async getCustomerByCode(customerCode: string): Promise<CustomerDetailResponseDTO> {
    const response = await apiClient.get<CustomerDetailResponseDTO>(
      `/api/customers/${encodeURIComponent(customerCode)}`
    );
    return response.data;
  },

  /**
   * 3. Register Personal Customer
   * Primary: POST /api/customers/personal
   * Fallback: POST /api/customers
   */
  async createPersonalCustomer(dto: PersonalCustomerCreateDTO): Promise<CustomerResponseDTO> {
    const nameParts = dto.fullName.trim().split(/\s+/);
    const firstName = dto.firstName || nameParts[0] || '';
    const lastName = dto.lastName || nameParts.slice(1).join(' ') || (firstName ? '' : 'Customer');

    const payload = {
      customerType: 'PERSONAL',
      fullName: dto.fullName.trim(),
      firstName: firstName,
      lastName: lastName,
      nrc: dto.nrc.trim(),
      phone: dto.phone.trim(),
      email: dto.email.trim(),
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
      address: dto.address.trim(),
      occupation: dto.occupation?.trim() || 'Employee',
      status: 'ACTIVE',
    };

    try {
      const response = await apiClient.post<CustomerResponseDTO>('/api/customers/personal', payload);
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const fallbackRes = await apiClient.post<CustomerResponseDTO>('/api/customers', payload);
        return fallbackRes.data;
      }
      throw err;
    }
  },

  /**
   * 4. Register Company Customer
   * Primary: POST /api/customers/company
   * Fallback: POST /api/customers
   */
  async createCompanyCustomer(dto: CompanyCustomerCreateDTO): Promise<CustomerResponseDTO> {
    const payload = {
      customerType: 'COMPANY',
      companyName: dto.companyName.trim(),
      fullName: dto.companyName.trim(),
      registrationNumber: dto.registrationNumber.trim(),
      taxId: dto.taxId.trim(),
      officialEmail: dto.officialEmail.trim(),
      email: (dto.officialEmail || dto.email || '').trim(),
      phone: dto.phone.trim(),
      businessAddress: dto.businessAddress.trim(),
      address: (dto.businessAddress || dto.address || '').trim(),
      businessType: dto.businessType?.trim() || 'Corporate Entity',
      establishedDate: dto.establishedDate,
      status: 'ACTIVE',
    };

    try {
      const response = await apiClient.post<CustomerResponseDTO>('/api/customers/company', payload);
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const fallbackRes = await apiClient.post<CustomerResponseDTO>('/api/customers', payload);
        return fallbackRes.data;
      }
      throw err;
    }
  },

  /**
   * 5. Update Customer by Code
   * PUT /api/customers/{customerCode}
   */
  async updateCustomer(customerCode: string, dto: CustomerUpdateDTO): Promise<any> {
    const response = await apiClient.put(
      `/api/customers/${encodeURIComponent(customerCode)}`,
      dto
    );
    return response.data;
  },

  /**
   * 6. Update Customer KYC Status
   * PATCH /api/customers/{customerCode}/kyc-status
   */
  async updateKycStatus(customerCode: string, status: 'ACTIVE' | 'REJECTED' | 'VERIFIED'): Promise<any> {
    const response = await apiClient.patch(
      `/api/customers/${encodeURIComponent(customerCode)}/kyc-status`,
      { status }
    );
    return response.data;
  },
};

export default customerService;
