export interface P2PTransferRequest {
  sourceAccountNumber: string;
  destinationAccountNumber: string;
  amount: number;
  currency: string;
  transactionPin: string;
  description?: string;
  idempotencyKey: string;
}

export interface P2PTransferResponse {
  transactionRef: string;
  status: string;
  sourceAccountNumber: string;
  destinationAccountNumber: string;
  amount: number;
  serviceFee: number;
  totalDebitedAmount: number;
  currency: string;
  completedAt: string;
  description: string;
}