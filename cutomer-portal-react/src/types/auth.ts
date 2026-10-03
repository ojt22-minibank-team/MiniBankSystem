export interface LoginRequest {
  loginIdentifier: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  otpRequired: boolean;
  challengeGroupId: string;
  maskedEmail: string;
}

export interface OtpVerifyRequest {
  challengeGroupId: string;
  otp: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  message: string;

  firstLoginSetupRequired: boolean;
  passwordChangeRequired: boolean;
  pinSetupRequired: boolean;

  accessToken: string | null;
  refreshToken: string | null;
}

export interface ResendOtpRequest {
  challengeGroupId: string;
}

export interface ResendOtpResponse {
  success: boolean;
  message: string;
  challengeGroupId: string;
  maskedEmail: string;
}
export interface ChangePasswordRequest {
  challengeGroupId: string;
  newPassword: string;
  confirmPassword: string;
}

// ======================================================
// PASSWORD RESET - REQUEST OTP
// ======================================================

export interface PasswordResetRequest {
  loginIdentifier: string;
}

export interface PasswordResetStartResponse {
  success: boolean;
  message: string;
  challengeGroupId: string;
  destinationMasked: string;
}


// ======================================================
// PASSWORD RESET - VERIFY OTP
// ======================================================

export interface PasswordResetOtpVerifyRequest {
  challengeGroupId: string;
  otp: string;
}
export interface PasswordResetOtpVerifyResponse {
  success: boolean;
  message: string;
  challengeGroupId: string;
}

// ======================================================
// PASSWORD RESET - CONFIRM NEW PASSWORD
// ======================================================

export interface PasswordResetConfirmRequest {
  verifiedChallengeGroupId: string;
  newPassword: string;
  confirmPassword: string;
}

export interface SetupPinRequest {
  challengeGroupId: string;
  pin: string;
  confirmPin: string;
}
export interface TokenResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
}