import axios from 'axios';

// Matches PaymentDetailsResponse.java
export interface PaymentDetails {
  merchantName: string;
  merchantAccountId: string;
  amount: number;
  currency: string;
  orderReference: string;
}

// Matches MerchantPaymentRequest.java
export interface PaymentRequest {
  paymentToken: string;
  customerId: string;
  merchantAccountId: string;
  amount: number;
  transactionPin: string;
}

// Matches PaymentReceiptResponse.java
export interface PaymentReceipt {
  success: boolean;
  message: string;
  paymentToken: string;
  coreLedgerReference: string;
  merchantAccountId: string;
  amount: number;
  currency: string;
  timestamp: string;
}

const API_BASE_URL = 'http://localhost:8080/api/v1/merchant-payment';

export const fetchPaymentDetails = async (token: string): Promise<PaymentDetails> => {
  const response = await axios.get<PaymentDetails>(`${API_BASE_URL}/request/${token}`);
  return response.data;
};

export const authorizePayment = async (request: PaymentRequest): Promise<PaymentReceipt> => {
  const response = await axios.post<PaymentReceipt>(`${API_BASE_URL}/authorize`, request);
  return response.data;
};
