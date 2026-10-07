export interface PaymentDetails {
    merchantName: string;
    orderId: string;
    amount: number;
    currency: string;
    status: string;
}

export interface CustomerAccount {
    accountId: string;
    accountNumber: string;
    accountType: string;
    availableBalance: number;
    currency: string;
}

export interface PaymentReceipt {
    success: boolean;
    message: string;
    paymentToken: string;
    coreLedgerReference: string;
    amount: number;
    currency: string;
    timestamp: string;
}

export interface AuthorizePaymentPayload {
    paymentToken: string;
    accountId: string;
    amount: number;
    transactionPin: string;
}
