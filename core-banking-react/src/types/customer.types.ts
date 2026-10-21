export type CustomerType = 'PERSONAL' | 'COMPANY' | 'INDIVIDUAL';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING' | 'REJECTED';
export type GenderType = 'MALE' | 'FEMALE' | 'OTHER';

export interface PersonalCustomerCreateDTO {
  fullName: string;
  nrc: string;
  phone: string;
  email: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: GenderType | string;
  address: string;
  occupation?: string;
  customerType?: 'PERSONAL';
  firstName?: string;
  lastName?: string;
}

export interface CompanyCustomerCreateDTO {
  companyName: string;
  registrationNumber: string;
  taxId: string;
  officialEmail: string;
  phone: string;
  businessAddress: string;
  establishedDate?: string;
  businessType?: string;
  email?: string;
  address?: string;
  customerType?: 'COMPANY';
}

export interface CustomerDTO {
  customerType: string;
  phone: string;
  email: string;
  address: string;
  status?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  nrc?: string;
  occupation?: string;
  companyName?: string;
  registrationNumber?: string;
  taxId?: string;
  businessType?: string;
  officialEmail?: string;
  businessAddress?: string;
  establishedDate?: string;
}

export interface CustomerResponseDTO {
  customerCode: string;
  customerType: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  temporaryPassword?: string;
}

export interface CustomerDetailResponseDTO {
  customerCode: string;
  customerType: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  updatedAt?: string;

  // Personal fields
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  nrc?: string;
  address?: string;
  occupation?: string;

  // Company fields
  companyName?: string;
  registrationNumber?: string;
  taxId?: string;
  businessType?: string;
  country?: string;
  officialEmail?: string;
  businessAddress?: string;
}

export interface CustomerUpdateDTO {
  email?: string;
  phone?: string;
  address?: string;
  occupation?: string;
  businessType?: string;
  status?: string;
}
