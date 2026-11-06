import api from '../../../config/api';
import type { PaymentDetails, CustomerAccount, PaymentReceipt, AuthorizePaymentPayload } from '../types/merchantPayment';

export const fetchPaymentDetails = async (token: string): Promise<PaymentDetails> => {
  const response = await api.get(`/merchant-payment/request/${encodeURIComponent(token)}`);
  return response.data;
};

export const fetchCustomerAccounts = async (): Promise<CustomerAccount[]> => {
  const response = await api.get('/accounts');
  return response.data;
};

export const authorizePayment = async (payload: AuthorizePaymentPayload): Promise<PaymentReceipt> => {
  const response = await api.post('/merchant-payment/authorize', payload);
  return response.data;
};

export const cancelPayment = async (paymentToken: string, accountId?: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post('/merchant-payment/cancel', {
    paymentToken,
    accountId: accountId || 'UNKNOWN'
  });
  return response.data;
};
