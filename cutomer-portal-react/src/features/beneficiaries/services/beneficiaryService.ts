import api from '../../../config/api';
import type { Beneficiary, AddBeneficiaryRequest } from '../types/beneficiaryTypes';

export const getBeneficiaries = async (): Promise<Beneficiary[]> => {
  const response = await api.get<Beneficiary[]>('/beneficiaries');
  return response.data;
};

export const addBeneficiary = async (
  data: AddBeneficiaryRequest
): Promise<Beneficiary> => {
  const response = await api.post<Beneficiary>('/beneficiaries', data);
  return response.data;
};

export const deleteBeneficiary = async (
  beneficiaryId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>(
    `/beneficiaries/${beneficiaryId}`
  );
  return response.data;
};