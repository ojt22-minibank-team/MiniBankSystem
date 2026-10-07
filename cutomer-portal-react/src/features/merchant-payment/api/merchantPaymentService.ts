import api from '../../../config/api';
import type{ PaymentDetails, CustomerAccount, PaymentReceipt, AuthorizePaymentPayload } from '../types/merchantPayment';

export const fetchPaymentDetails = async (token: string): Promise<PaymentDetails> => {
  const response = await api.get(`/merchant-payment/request/${token}`);
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
