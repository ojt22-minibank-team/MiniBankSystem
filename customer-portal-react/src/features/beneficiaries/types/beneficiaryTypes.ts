export interface Beneficiary {
  beneficiaryId: string;
  beneficiaryAccountNumber: string;
  beneficiaryAccountName: string;
  beneficiaryAccountType?: string;
  nickname: string;
  ownerAccountNumber?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AddBeneficiaryRequest {
  beneficiaryAccountNumber: string;
  nickname?: string;
  ownerAccountNumber?: string;
}