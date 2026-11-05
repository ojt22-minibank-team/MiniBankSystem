export interface CorporateLoginRequest {
  companyCustomerCode: string;
  corporateUserCode: string;
  password: string;
}

export interface CorporateLoginResponse {
  success: boolean;
  message: string;
  otpRequired: boolean;
  challengeGroupId: string;
}

export interface CorporateTokens {
  accessToken: string;
  refreshToken: string;
}

export interface CorporateOtpResponse {
  success: boolean;
  message: string;
  firstLogin: boolean;
  passwordChangeRequired: boolean;
  pinSetupRequired: boolean;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface CorporateResendResponse {
  success: boolean;
  message: string;
  challengeGroupId: string;
  resendNo: number;
}

export type CorporateSetupStep = "password" | "pin" | "complete";
