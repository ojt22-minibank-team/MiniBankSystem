import { useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import { transfersApi } from '../../../services/apiClient';
import type { P2PTransferResponseDto } from '../../../types/api.types';
import { formatCurrency } from '../../../utils/formatCurrency';
import type { AxiosError } from 'axios';

export default function TransfersPage() {
  const [sourceAccount, setSourceAccount] = useState('');
  const [destAccount, setDestAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<P2PTransferResponseDto | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceAccount.trim() || !destAccount.trim() || !amount) {
      setError('Source account, destination account, and amount are required.');
      return;
    }

    if (sourceAccount.trim() === destAccount.trim()) {
      setError('Source and destination accounts cannot be identical.');
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be a positive number.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setReceipt(null);

    const idempotencyKey = `p2p_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await transfersApi.p2pTransfer(
        {
          sourceAccountNumber: sourceAccount.trim(),
          destinationAccountNumber: destAccount.trim(),
          amount: numAmount,
          remark: remark.trim() || undefined,
        },
        idempotencyKey,
      );

      setReceipt(res.data);
      // Reset form
      setAmount('');
      setRemark('');
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setError(
        axErr.response?.data?.message ||
          'Transfer failed. Please check account numbers, balances, and try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout pageTitle="Transfers & Payments">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Peer-to-Peer Transfer</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Execute direct account-to-account funds transfers with real-time settlement.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Transfer Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p className="font-semibold">Transfer Execution Failed</p>
                <p className="mt-1">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Source Account Number"
                placeholder="e.g. 1001-0001-0001"
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
                required
                disabled={isLoading}
              />
              <Input
                label="Destination Account Number"
                placeholder="e.g. 1001-0002-0002"
                value={destAccount}
                onChange={(e) => setDestAccount(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Transfer Amount"
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={isLoading}
              />
              <Input
                label="Transaction Remark (Optional)"
                placeholder="e.g. Invoice settlement / bill payment"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full sm:w-auto"
              >
                Execute P2P Transfer
              </Button>
            </div>
          </form>
        </div>

        {/* Receipt or Guidance Card */}
        <div className="space-y-4">
          {receipt ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm mb-4">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Transfer Completed
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-gray-500 uppercase font-semibold">Reference ID</p>
                  <p className="font-mono text-sm font-bold text-gray-900 mt-0.5">
                    {receipt.transactionReference}
                  </p>
                </div>
                <div className="border-t border-emerald-200 pt-2">
                  <p className="text-gray-500">Transferred Amount</p>
                  <p className="text-base font-bold text-gray-900">
                    {formatCurrency(receipt.amount, 'USD')}
                  </p>
                </div>
                {receipt.fee > 0 && (
                  <div>
                    <p className="text-gray-500">Service Fee</p>
                    <p className="font-semibold text-gray-700">
                      {formatCurrency(receipt.fee, 'USD')}
                    </p>
                  </div>
                )}
                <div className="border-t border-emerald-200 pt-2 space-y-1">
                  <p className="text-gray-500">From: <span className="font-mono text-gray-800">{receipt.sourceAccountNumber}</span></p>
                  <p className="text-gray-500">To: <span className="font-mono text-gray-800">{receipt.destinationAccountNumber}</span></p>
                  <p className="text-gray-500">Status: <span className="font-bold text-emerald-700">{receipt.status}</span></p>
                  <p className="text-gray-400 text-[10px]">Date: {new Date(receipt.transactedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-900">Transfer Guidelines</h4>
              <ul className="mt-3 space-y-2 text-xs text-gray-600 list-disc list-inside">
                <li>Internal transfers occur instantaneously between accounts.</li>
                <li>System rules fee schedule is dynamically assessed upon execution.</li>
                <li>Each transfer generates an idempotency key to prevent accidental duplicates.</li>
                <li>Ensure sender account has sufficient cleared funds.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
