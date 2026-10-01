export interface CustomerProfile {
  customerCode: string;
  customerType: string;
  status: string;

  // Personal
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  nrc: string | null;
  passportNumber: string | null;
  email: string | null;
  phone: string | null;
  occupation: string | null;

  // Address
  address: string | null;
  city: string | null;
  stateRegion: string | null;
  country: string | null;

  // Company
  companyName: string | null;
  registrationNumber: string | null;
  taxId: string | null;
  businessType: string | null;
  incorporationDate: string | null;
  companyPhone: string | null;
  companyEmail: string | null;

  // Image
  profileImageUrl: string | null;
}

export interface CustomerProfileUpdate {
  email: string;
  phone: string;
  occupation: string;
  address: string;
  city: string;
  stateRegion: string;
  country: string;
  companyPhone: string;
  companyEmail: string;
}