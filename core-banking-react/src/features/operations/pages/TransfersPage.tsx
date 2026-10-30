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
    <AdminLayout pageTitle="Transactions">
      <div className="max-w-[1440px] mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div>
            <h2 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
              Peer-to-Peer Transfer Desk
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-medium">
              Execute direct core account-to-account funds transfers with real-time settlement
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/80 px-3.5 py-1.5 rounded-full shadow-xs w-fit">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Instant Settlement Protocol</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Transfer Form Container */}
          <div className="bg-white rounded-xl p-6 sm:p-8 lg:col-span-2 border border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              {/* Sleek Theme Sky Blue Badge (replacing black logo) */}
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100 shadow-xs">
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Initiate Fund Transfer
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Direct intra-bank ledger transfer with idempotency protection
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-start gap-2.5">
                <svg className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Source Account Number"
                  placeholder="e.g. 1008207493"
                  value={sourceAccount}
                  onChange={(e) => setSourceAccount(e.target.value)}
                  disabled={isLoading}
                  required
                />

                <Input
                  label="Destination Account Number"
                  placeholder="e.g. 2007384568"
                  value={destAccount}
                  onChange={(e) => setDestAccount(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Transfer Amount (MMK)"
                  placeholder="Minimum 100 MMK"
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isLoading}
                  required
                />

                <Input
                  label="Transaction Remark (Optional)"
                  placeholder="e.g. Invoice payment or vendor settlement"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="pt-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  className="w-full sm:w-auto px-8"
                >
                  Execute P2P Transfer
                </Button>
              </div>
            </form>
          </div>

          {/* Receipt or Guidance Card */}
          <div className="space-y-5">
            {receipt ? (
              <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
                      ✓
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Settlement Success
                    </span>
                  </div>
                  <span className="status-pill-emerald text-[10px]">
                    {receipt.status}
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase font-semibold">Reference ID</p>
                    <p className="font-mono text-sm font-bold text-slate-900 mt-0.5 tracking-wide">
                      {receipt.transactionReference}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-[11px] text-slate-400 uppercase font-semibold">Transferred Amount</p>
                    <p className="text-2xl font-bold text-sky-600 font-mono mt-0.5 tabular-nums">
                      {formatCurrency(receipt.amount, 'MMK')}
                    </p>
                  </div>

                  {receipt.fee > 0 && (
                    <div>
                      <p className="text-[11px] text-slate-400">Service Fee</p>
                      <p className="font-bold text-slate-800 font-mono">
                        {formatCurrency(receipt.fee, 'MMK')}
                      </p>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-3 space-y-1.5 text-[11px]">
                    <p className="text-slate-500">
                      Source: <span className="font-mono text-slate-800 font-bold">{receipt.sourceAccountNumber}</span>
                    </p>
                    <p className="text-slate-500">
                      Destination: <span className="font-mono text-slate-800 font-bold">{receipt.destinationAccountNumber}</span>
                    </p>
                    <p className="text-slate-400 text-[10px] pt-1">
                      Timestamp: {new Date(receipt.transactedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] space-y-4">
                {/* Modern Guidelines SVG Header (replacing ugly emoji) */}
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100 shadow-xs">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                    Transfer Guidelines & Safety
                  </h4>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="text-sky-500 font-bold">•</span>
                    <span>Internal transfers clear instantaneously between registered accounts.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sky-500 font-bold">•</span>
                    <span>System rules fee schedules are evaluated dynamically upon execution.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sky-500 font-bold">•</span>
                    <span>Each transfer auto-generates a unique idempotency key to prevent double entries.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sky-500 font-bold">•</span>
                    <span>Sender account must have sufficient cleared available funds.</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
