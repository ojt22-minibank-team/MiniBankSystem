import axios from 'axios';

// Matches PaymentDetailsResponse.java
export interface PaymentDetails {
  merchantName: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
}

// Matches MerchantPaymentRequest.java
export interface PaymentRequest {
  paymentToken: string;
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

const API_BASE_URL = 'http://localhost:8080/api/customer/merchant-payment';

export const fetchPaymentDetails = async (token: string): Promise<PaymentDetails> => {
  const response = await axios.get<PaymentDetails>(`${API_BASE_URL}/request/${token}`);
  return response.data;
};

export const authorizePayment = async (request: PaymentRequest): Promise<PaymentReceipt> => {
  const token = localStorage.getItem('token');
  const response = await axios.post<PaymentReceipt>(`${API_BASE_URL}/authorize`, request, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};
