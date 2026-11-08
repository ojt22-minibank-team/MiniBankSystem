import { useState, useRef, useEffect } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import { otcApi, accountsApi, staffProfileApi } from '../../../services/apiClient';
import type { OtcTransactionResponseDto, AccountResponse, OtcParametersResponse, OtcAccountLimitResponse, StaffResponse } from '../../../types/api.types';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import type { AxiosError } from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import ekarajCrown from '../../../assets/ekaraj-crown-transparent.png';

type OtcOperationType = 'DEPOSIT' | 'WITHDRAW';

/**
 * Converts numeric amount to standard English words for formal banking vouchers.
 */
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
    if (n < 1000000)
      return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 1000000000)
      return inWords(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 !== 0 ? ' ' + inWords(n % 1000000) : '');
    return inWords(Math.floor(n / 1000000000)) + ' Billion' + (n % 1000000000 !== 0 ? ' ' + inWords(n % 1000000000) : '');
  }

  const integerPart = Math.floor(Math.abs(num));
  return inWords(integerPart);
}

function formatAmountToWords(amount: number, currency: string = 'MMK'): string {
  const words = numberToWords(amount);
  const currLabel = currency.toUpperCase() === 'MMK' ? 'Myanmar Kyats' : currency.toUpperCase();
  return `${words} ${currLabel} Only`;
}

/**
 * Formats ISO timestamp cleanly into 'DD/MM/YYYY, h:mm A' (e.g. '29/10/2026, 1:43 PM') without seconds.
 */
function formatTransactionDateTime(dateInput?: string | Date | null): string {
  const d = dateInput ? (typeof dateInput === 'string' ? new Date(dateInput) : dateInput) : new Date();
  if (isNaN(d.getTime())) return '—';
  return (
    d.toLocaleDateString('en-GB') +
    ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  );
}

/**
 * Masks account number for customer-facing documents to ensure data privacy (e.g. 1001****0014).
 */
function maskAccountNumber(accountNumber?: string | null): string {
  if (!accountNumber) return '—';
  const clean = accountNumber.trim();
  if (clean.length <= 4) return clean;
  if (clean.length <= 8) {
    return clean.slice(0, 2) + '****' + clean.slice(-2);
  }
  const first = clean.slice(0, 4);
  const last = clean.slice(-4);
  return `${first}${'*'.repeat(Math.max(4, clean.length - 8))}${last}`;
}

/**
 * Masks the last 3 digits of NRC ID for customer receipts (e.g. 5/PATHA(N)789***)
 */
function maskNrcLastThree(nrc?: string | null): string {
  if (!nrc) return '—';
  const trimmed = nrc.trim();
  if (trimmed.length <= 3) return '***';
  return trimmed.slice(0, -3) + '***';
}

/**
 * Builds comprehensive digital verification text encoded into the voucher QR code.
 */
function formatReceiptQrText(receipt: OtcTransactionResponseDto): string {
  const isDeposit = receipt.transactionType === 'OTC_DEPOSIT';
  const typeLabel = isDeposit ? 'CASH DEPOSIT' : 'CASH WITHDRAWAL';
  const curr = receipt.currency || 'MMK';
  const dateStr = formatTransactionDateTime(receipt.transactedAt);

  return [
    'EKARAJ BANK - OFFICIAL OTC VOUCHER',
    `REF: ${receipt.transactionRef}`,
    `SLIP: ${receipt.manualReferenceId || 'N/A'}`,
    `TYPE: ${typeLabel}`,
    `ACC: ${maskAccountNumber(receipt.accountNumber)}`,
    `NAME: ${receipt.customerName}`,
    `AMOUNT: ${formatCurrency(receipt.amount, curr)}`,
    `SERVICE FEE: ${formatCurrency(receipt.serviceFee ?? 0, curr)}`,
    `BALANCE AFTER: ${formatCurrency(receipt.balanceAfter, curr)}`,
    `DATE: ${dateStr}`,
    `TELLER: ${receipt.tellerUsername}`,
    'STATUS: COMPLETED & SETTLED',
  ].join('\n');
}

/**
 * Calculates estimated service fee for OTC operations based on active fee parameters.
 */
function computeEstimatedFee(
  amount: number,
  operationType: OtcOperationType,
  params: OtcParametersResponse | null,
): number {
  if (!params || !amount || amount <= 0) return 0;
  const isDeposit = operationType === 'DEPOSIT';
  const feeType = isDeposit ? params.depositFeeType : params.withdrawalFeeType;
  const feeVal = Number(isDeposit ? params.depositFeeValue : params.withdrawalFeeValue) || 0;
  const minFee = isDeposit ? params.depositMinFee : params.withdrawalMinFee;
  const maxFee = isDeposit ? params.depositMaxFee : params.withdrawalMaxFee;

  let fee = 0;
  if (feeType === 'PERCENTAGE') {
    fee = (amount * feeVal) / 100;
  } else {
    fee = feeVal;
  }
  if (minFee != null && minFee > 0 && fee < minFee) {
    fee = minFee;
  }
  if (maxFee != null && maxFee > 0 && fee > maxFee) {
    fee = maxFee;
  }
  return Math.round(fee * 100) / 100;
}

function formatFeeScheduleDescription(
  operationType: OtcOperationType,
  params: OtcParametersResponse | null,
  currency: string = 'MMK',
): string {
  if (!params) return 'Standard Bank Tariff';
  const isDeposit = operationType === 'DEPOSIT';
  const feeType = isDeposit ? params.depositFeeType : params.withdrawalFeeType;
  const feeVal = Number(isDeposit ? params.depositFeeValue : params.withdrawalFeeValue) || 0;
  const minFee = isDeposit ? params.depositMinFee : params.withdrawalMinFee;
  const maxFee = isDeposit ? params.depositMaxFee : params.withdrawalMaxFee;

  if (feeVal === 0) {
    return '0 MMK (Fee-free)';
  }
  if (feeType === 'FLAT') {
    return `${formatCurrency(feeVal, currency)} Flat Fee`;
  }
  const minMaxParts: string[] = [];
  if (minFee != null && minFee > 0) minMaxParts.push(`Min: ${formatCurrency(minFee, currency)}`);
  if (maxFee != null && maxFee > 0) minMaxParts.push(`Max: ${formatCurrency(maxFee, currency)}`);
  const bounds = minMaxParts.length > 0 ? ` (${minMaxParts.join(', ')})` : '';
  return `${feeVal}%${bounds}`;
}

export default function OtcTransactionPage() {
  const [operationType, setOperationType] = useState<OtcOperationType>('DEPOSIT');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [manualReferenceId, setManualReferenceId] = useState('');
  const [manualAuditNote, setManualAuditNote] = useState('');

  // Account verification state
  const [verifiedAccount, setVerifiedAccount] = useState<AccountResponse | null>(null);
  const [accountLimits, setAccountLimits] = useState<OtcAccountLimitResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [accountLookupError, setAccountLookupError] = useState<string | null>(null);

  // Form submission and confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<OtcTransactionResponseDto | null>(null);
  const [printMode, setPrintMode] = useState<'CUSTOMER' | 'BANK' | 'DUAL'>('DUAL');

  const [isPreValidating, setIsPreValidating] = useState(false);
  const [otcParams, setOtcParams] = useState<OtcParametersResponse | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffResponse | null>(null);

  // Load OTC system parameters and current staff profile on mount
  useEffect(() => {
    otcApi.getParameters()
      .then((res) => {
        setOtcParams(res.data);
      })
      .catch((err) => {
        console.error('Failed to load OTC system parameters:', err);
      });

    staffProfileApi.getMe()
      .then((res) => {
        setStaffProfile(res.data);
      })
      .catch((err) => {
        console.warn('Failed to load staff profile:', err);
      });
  }, []);

  const voucherTopRef = useRef<HTMLDivElement>(null);
  const errorNoticeRef = useRef<HTMLDivElement>(null);

  // Automatically scroll viewport to top when switching between receipt and operations form
  useEffect(() => {
    const scrollToTop = () => {
      if (voucherTopRef.current) {
        voucherTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const timer = setTimeout(scrollToTop, 50);
    return () => clearTimeout(timer);
  }, [receipt]);

  // Automatically scroll viewport to the red error notice whenever an error occurs
  useEffect(() => {
    if (error) {
      const scrollToError = () => {
        const mainEl = document.querySelector('main');
        if (mainEl) {
          mainEl.scrollTo({ top: 0, behavior: 'smooth' });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (errorNoticeRef.current) {
          errorNoticeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };

      const timer = setTimeout(scrollToError, 60);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleLookupAccount = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!accountNumber.trim()) {
      setAccountLookupError('Please enter an account number to verify.');
      return;
    }
    setIsVerifying(true);
    setAccountLookupError(null);

    try {
      const res = await accountsApi.getByNumber(accountNumber.trim());
      setVerifiedAccount(res.data);
      setError(null);

      // Fetch dynamic counter withdrawal limits and today's utilization
      try {
        const limitsRes = await otcApi.getAccountLimits(accountNumber.trim());
        setAccountLimits(limitsRes.data);
      } catch {
        // Fallback: non-blocking if account limits endpoint encounters issue
        setAccountLimits(null);
      }
    } catch (err) {
      setVerifiedAccount(null);
      setAccountLimits(null);
      const axErr = err as AxiosError<{ message?: string }>;
      setAccountLookupError(
        axErr.response?.data?.message || 'Account not found. Please verify the account number.',
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '');
    if (!/^\d*$/.test(rawValue)) return;
    if (!rawValue) {
      setAmount('');
      if (error) setError(null);
      return;
    }
    const cleanDigits = rawValue.replace(/^0+(?=\d)/, '');
    const formatted = cleanDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    setAmount(formatted);
    if (error) setError(null);
  };

  // Pre-validate form inputs and business rules before triggering the Confirmation Modal (1st click)
  const handleInitiateConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountNumber.trim()) {
      setError('Account number is required.');
      return;
    }

    if (!verifiedAccount) {
      setError('Please click Verify and ensure the target account is verified before proceeding.');
      return;
    }

    if (verifiedAccount.status !== 'ACTIVE') {
      setError(`Account is not active. Current status: ${verifiedAccount.status}. Only ACTIVE accounts can perform transactions.`);
      return;
    }

    const numAmount = Number(amount.replace(/,/g, ''));
    const estimatedFee = computeEstimatedFee(numAmount, operationType, otcParams);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Transaction amount must be a valid number greater than zero.');
      return;
    }

    // Dynamic DB Minimum Deposit Validation
    if (operationType === 'DEPOSIT' && otcParams?.minDepositAmount != null && numAmount < otcParams.minDepositAmount) {
      setError(`Deposit amount must be at least ${formatCurrency(otcParams.minDepositAmount, verifiedAccount.currency || 'MMK')}.`);
      return;
    }

    if (operationType === 'DEPOSIT' && estimatedFee > 0 && numAmount <= estimatedFee) {
      setError(
        `Deposit amount (${formatCurrency(numAmount, verifiedAccount.currency || 'MMK')}) must be strictly greater than the service fee (${formatCurrency(estimatedFee, verifiedAccount.currency || 'MMK')}).`
      );
      return;
    }

    // Dynamic DB Minimum Withdrawal Validation
    if (operationType === 'WITHDRAW' && otcParams?.minWithdrawalAmount != null && numAmount < otcParams.minWithdrawalAmount) {
      setError(`Withdrawal amount must be at least ${formatCurrency(otcParams.minWithdrawalAmount, verifiedAccount.currency || 'MMK')}.`);
      return;
    }

    // Dynamic DB Minimum Balance & Available Funds Validation for Withdrawal
    if (operationType === 'WITHDRAW') {
      const availBal = verifiedAccount.availableBalance ?? 0;
      const minBalRequired = otcParams?.minimumBalance ?? 0;
      const netAvailable = availBal - minBalRequired;

      const totalRequired = numAmount + estimatedFee;
      if (netAvailable < totalRequired) {
        if (minBalRequired > 0) {
          setError(
            `Insufficient available funds. Required: ${formatCurrency(totalRequired, verifiedAccount.currency || 'MMK')} (${formatCurrency(numAmount, verifiedAccount.currency || 'MMK')} cash + ${formatCurrency(estimatedFee, verifiedAccount.currency || 'MMK')} fee) while maintaining minimum balance of ${formatCurrency(minBalRequired, verifiedAccount.currency || 'MMK')}. Net available: ${formatCurrency(netAvailable > 0 ? netAvailable : 0, verifiedAccount.currency || 'MMK')}.`
          );
        } else {
          setError(
            `Withdrawal amount (${formatCurrency(numAmount, verifiedAccount.currency || 'MMK')}) exceeds available balance (${formatCurrency(availBal, verifiedAccount.currency || 'MMK')}).`
          );
        }
        return;
      }
    }

    // Dynamic DB One-Time Maximum Withdrawal Limit Validation (1st Click)
    const oneTimeLimit = accountLimits?.maxOnetimeWithdrawal ?? otcParams?.maxOnetimeWithdrawal;
    if (
      operationType === 'WITHDRAW' &&
      oneTimeLimit != null &&
      oneTimeLimit > 0 &&
      numAmount > oneTimeLimit
    ) {
      setError(
        `Withdrawal amount (${formatCurrency(numAmount, verifiedAccount.currency || 'MMK')}) exceeds the one-time counter limit of ${formatCurrency(oneTimeLimit, verifiedAccount.currency || 'MMK')}.`
      );
      return;
    }

    // Dynamic DB Cumulative Daily Withdrawal Limit Validation (1st Click)
    if (
      operationType === 'WITHDRAW' &&
      accountLimits != null &&
      accountLimits.maxDailyWithdrawal > 0
    ) {
      const todayWithdrawn = accountLimits.todayWithdrawnAmount ?? 0;
      const remainingDaily = accountLimits.remainingDailyLimit ?? (accountLimits.maxDailyWithdrawal - todayWithdrawn);
      if (numAmount > remainingDaily) {
        setError(
          `Daily withdrawal limit exceeded. Total withdrawn today: ${formatCurrency(todayWithdrawn, verifiedAccount.currency || 'MMK')}. Maximum remaining available to withdraw today is ${formatCurrency(remainingDaily > 0 ? remainingDaily : 0, verifiedAccount.currency || 'MMK')}.`
        );
        return;
      }
    }

    if (!remark.trim()) {
      setError('Customer statement narration is required.');
      return;
    }

    if (!manualReferenceId.trim()) {
      setError('Counter voucher / slip reference ID is required.');
      return;
    }

    if (!manualAuditNote.trim()) {
      setError('Internal audit note is required.');
      return;
    }

    // Check duplicate voucher / slip reference ID against database
    try {
      setIsPreValidating(true);
      const checkRes = await otcApi.checkReference(manualReferenceId.trim());
      if (checkRes.data?.exists) {
        setError(`Counter Voucher / Reference ID '${manualReferenceId.trim()}' already exists. Please enter a unique reference.`);
        return;
      }
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setError(axErr.response?.data?.message || 'Failed to verify Counter Voucher Reference ID. Please try again.');
      return;
    } finally {
      setIsPreValidating(false);
    }

    setError(null);
    setShowConfirmModal(true);
  };

  // Actual execution triggered inside Confirmation Modal (2nd click)
  const handleExecuteTransaction = async () => {
    const numAmount = Number(amount.replace(/,/g, ''));
    setIsLoading(true);

    const idempotencyKey = `otc_${operationType.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const payload = {
        accountNumber: accountNumber.trim(),
        amount: numAmount,
        remark: remark.trim(),
        manualReferenceId: manualReferenceId.trim(),
        manualAuditNote: manualAuditNote.trim(),
      };

      const res =
        operationType === 'DEPOSIT'
          ? await otcApi.deposit(payload, idempotencyKey)
          : await otcApi.withdraw(payload, idempotencyKey);

      setReceipt(res.data);
      // Update local verified account balance if present
      if (verifiedAccount) {
        setVerifiedAccount({
          ...verifiedAccount,
          currentBalance: res.data.balanceAfter,
          availableBalance: res.data.balanceAfter,
        });
      }
      if (operationType === 'WITHDRAW' && accountLimits) {
        const newTodayWithdrawn = (accountLimits.todayWithdrawnAmount ?? 0) + numAmount;
        const newRemaining = Math.max(0, (accountLimits.maxDailyWithdrawal ?? 20000000) - newTodayWithdrawn);
        setAccountLimits({
          ...accountLimits,
          todayWithdrawnAmount: newTodayWithdrawn,
          remainingDailyLimit: newRemaining,
        });
      }
      setShowConfirmModal(false);
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      const errorMsg =
        axErr.response?.data?.message ||
        `OTC ${operationType === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} failed. Please try again.`;

      // Close modal and display error cleanly in the Operation Notice banner on the form
      setShowConfirmModal(false);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset all state to start a clean new transaction
  const handleResetForNewTransaction = () => {
    setReceipt(null);
    setError(null);
    setAmount('');
    setRemark('');
    setManualReferenceId('');
    setManualAuditNote('');
    setAccountNumber('');
    setVerifiedAccount(null);
    setAccountLimits(null);
    setAccountLookupError(null);
  };

  const handlePrintVoucher = (mode?: 'CUSTOMER' | 'BANK' | 'DUAL') => {
    const targetMode = mode || printMode;
    setPrintMode(targetMode);
    setTimeout(() => {
      window.print();
    }, 60);
  };

  const renderSlip = (copyType: 'CUSTOMER' | 'BANK') => {
    if (!receipt) return null;
    const isCustomer = copyType === 'CUSTOMER';
    const isDeposit = receipt.transactionType === 'OTC_DEPOSIT';
    const curr = receipt.currency || 'MMK';
    const auditNote = receipt.manualAuditNote || manualAuditNote;
    const staffNoLabel = staffProfile?.staffNo ? `(${staffProfile.staffNo})` : '';

    return (
      <div className="slip-container rounded-xl border border-gray-300 bg-white p-3.5 sm:p-4.5 shadow-xs text-gray-800 space-y-2 relative overflow-hidden text-xs">
        {/* Subtle Watermark Logo */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.035]">
          <img src={ekarajCrown} alt="" className="h-32 w-32 object-contain" />
        </div>

        {/* Header Row: Bank Logo & Clean Branch Info + Plain Status Badges & QR */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-2">
          <div className="flex items-center gap-2.5">
            <img src={ekarajCrown} alt="EKARAJ BANK" className="h-8.5 w-auto object-contain shrink-0" />
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-gray-900 uppercase leading-none">
                EKARAJ BANK
              </h1>
              <p className="text-[10px] text-gray-600 font-semibold leading-tight mt-1">
                Yangon Main Branch (Code: BR-001)
              </p>
              <p className="text-[9px] text-gray-400 font-mono leading-tight mt-0.5">
                Counter #02 • Licensed Commercial Bank
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Digital Security Verification QR Code (Always Masked Account Number) */}
            <div className="flex flex-col items-center justify-center bg-white p-1 rounded-md border border-gray-200 shadow-2xs">
              <QRCodeSVG
                value={formatReceiptQrText(receipt)}
                size={58}
                level="M"
                includeMargin={true}
              />
              <span className="text-[7.5px] font-mono font-bold text-gray-500 mt-0.5 uppercase tracking-wider">
                Scan Verify
              </span>
            </div>

            {/* Plain Unbordered/Uncolored Typography for Voucher & Receipt Labels */}
            <div className="text-right">
              <span className="block text-xs font-black uppercase tracking-wider text-gray-900 leading-tight">
                {isDeposit ? 'Deposit Voucher' : 'Withdrawal Voucher'}
              </span>
              <span className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-600 leading-tight mt-0.5">
                {isCustomer ? 'Customer Receipt' : 'Branch Voucher'}
              </span>
              <p className="mt-1 text-[8.5px] text-gray-500 font-mono leading-tight">
                {formatTransactionDateTime(receipt.transactedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Reference Bar: Txn Ref, Counter Slip No, Processed By + Staff No (NO CHANNEL) */}
        <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-lg p-2 text-[10.5px] border border-gray-200">
          <div>
            <span className="text-gray-500 block text-[9px] uppercase font-bold tracking-wider">Transaction Ref</span>
            <span className="font-mono font-bold text-gray-900 block truncate">{receipt.transactionRef}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px] uppercase font-bold tracking-wider">Counter Slip No</span>
            <span className="font-mono font-bold text-blue-800 block truncate">{receipt.manualReferenceId || '—'}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px] uppercase font-bold tracking-wider">Processed By</span>
            <span className="font-mono font-bold text-gray-900 block truncate">
              {receipt.tellerUsername} {staffNoLabel}
            </span>
          </div>
        </div>

        {/* Customer & Account Particulars: Bank Account Number, Account Holder Name, NRC ID (Masked on Customer Receipt) */}
        <div className="grid grid-cols-3 gap-2 border border-gray-200 rounded-lg p-2 bg-white text-[10.5px]">
          <div>
            <span className="text-gray-500 block text-[9px] uppercase font-bold tracking-wider">Bank Account Number</span>
            <span className="font-mono font-black text-gray-900 text-xs sm:text-[13px] block mt-0.5 tracking-wide">
              {isCustomer ? maskAccountNumber(receipt.accountNumber) : receipt.accountNumber}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px] uppercase font-bold tracking-wider">Account Holder Name</span>
            <span className="font-bold text-gray-900 block truncate mt-0.5">{receipt.customerName}</span>
            <span className="text-[9px] font-mono text-gray-400 block">{receipt.customerCode}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px] uppercase font-bold tracking-wider">NRC ID</span>
            <span className="font-semibold text-gray-800 font-mono block mt-0.5 truncate">
              {isCustomer
                ? maskNrcLastThree(verifiedAccount?.nrc || receipt.nrc)
                : (verifiedAccount?.nrc || receipt.nrc || '—')}
            </span>
          </div>
        </div>

        {/* Financial Settlement Card */}
        <div className="rounded-lg border border-gray-900/80 p-2 bg-gray-50/60 space-y-1">
          <div className="flex items-baseline justify-between border-b border-gray-200 pb-1">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Net Cash Amount:</span>
            <span className="text-base sm:text-lg font-black font-mono text-gray-900 tracking-tight">
              {formatCurrency(receipt.amount, curr)}
            </span>
          </div>

          {/* Amount in Words */}
          <div className="text-[9.5px] text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200 flex items-baseline gap-1">
            <span className="font-bold text-gray-500 uppercase tracking-wide text-[8.5px] shrink-0">In Words:</span>
            <span className="font-serif italic font-semibold text-gray-900 truncate">
              "{formatAmountToWords(receipt.amount, curr)}"
            </span>
          </div>

          {/* Balances Summary */}
          <div className="grid grid-cols-3 gap-1 pt-0.5 text-center divide-x divide-gray-200 text-[10px]">
            <div>
              <span className="text-gray-500 block text-[8.5px]">Balance Before</span>
              <span className="font-mono font-medium text-gray-700 block mt-0.5">
                {formatCurrency(receipt.balanceBefore, curr)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block text-[8.5px]">Service Fee</span>
              <span className="font-mono font-medium text-gray-700 block mt-0.5">
                {formatCurrency(receipt.serviceFee ?? 0, curr)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block text-[8.5px] font-bold">New Available Balance</span>
              <span className="font-mono font-black text-blue-900 block mt-0.5">
                {formatCurrency(receipt.balanceAfter, curr)}
              </span>
            </div>
          </div>
        </div>

        {/* Customer Statement Narration */}
        {receipt.description && (
          <div className="text-[10px] border border-gray-200 rounded-md px-2 py-1 bg-white">
            <span className="text-gray-500 font-bold block text-[8.5px] uppercase tracking-wider">Customer Statement Narration:</span>
            <p className="font-medium text-gray-800 truncate mt-0.5">{receipt.description}</p>
          </div>
        )}

        {/* Internal Audit Note (Branch Voucher Only) */}
        {!isCustomer && auditNote && (
          <div className="text-[10px] border border-gray-200 rounded-md px-2 py-1 bg-white">
            <span className="text-gray-500 font-bold block text-[8.5px] uppercase tracking-wider">Internal Audit Note:</span>
            <p className="font-medium text-gray-800 truncate mt-0.5">{auditNote}</p>
          </div>
        )}

        {/* Dual Signatures Section */}
        <div className="pt-2 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-6 text-[9.5px]">
            <div>
              <div className="border-b border-gray-400 w-full mb-1"></div>
              <span className="font-bold text-gray-900 block">Customer Signature</span>
              <span className="text-[8px] text-gray-500 block">Date: ____________________</span>
            </div>
            <div className="text-right">
              <div className="border-b border-gray-400 w-full mb-1"></div>
              <span className="font-bold text-gray-900 block">Authorized Bank Teller & Stamp</span>
              <span className="text-[8px] text-gray-500 block">
                Processed by: {receipt.tellerUsername} {staffNoLabel} • {receipt.transactedAt ? formatDate(receipt.transactedAt) : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Compact Footer */}
        <div className="border-t border-gray-100 pt-0.5 text-[8px] text-gray-400 text-center leading-tight">
          EKARAJ BANK Official Counter Transaction Voucher • Licensed Commercial Bank
        </div>
      </div>
    );
  };

  // Financial calculations for Before vs After breakdown
  const currentBal = verifiedAccount?.availableBalance ?? 0;
  const numAmount = Number(amount.replace(/,/g, '')) || 0;
  const estimatedFee = computeEstimatedFee(numAmount, operationType, otcParams);
  const netDeposit = Math.max(0, numAmount - estimatedFee);
  const totalWithdrawal = numAmount + estimatedFee;
  const projectedBal =
    operationType === 'DEPOSIT' ? currentBal + netDeposit : currentBal - totalWithdrawal;

  return (
    <AdminLayout pageTitle="OTC Operations (Teller Counter)">
      {/* Print Specific CSS Styles */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
          }
          /* Completely hide all layout Chrome/Sidebar/Navbar elements */
          aside, nav, header, .no-print, [class*="Sidebar"], [class*="Navbar"], [class*="backdrop"] {
            display: none !important;
          }
          /* Reset root layout hierarchy so nothing offsets printable content */
          #root, #root > div, #root > div > div, main {
            display: block !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
            height: auto !important;
            min-height: auto !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-voucher, #printable-voucher * {
            visibility: visible !important;
          }
          #printable-voucher {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .slip-container {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* VIEW 1: DEDICATED OFFICIAL BANK VOUCHER / RECEIPT VIEW */}
      {receipt ? (
        <div ref={voucherTopRef} className="space-y-4 w-full max-w-4xl mx-auto pb-10">
          {/* Top Actions Bar (Unified: Segmented View Selector + Print Slip + Next Transaction) */}
          <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Transaction Completed Successfully</h3>
                <p className="text-[11px] text-gray-500 font-mono">
                  Ref: <span className="font-semibold text-gray-800">{receipt.transactionRef}</span>
                </p>
              </div>
            </div>

            {/* Segmented View Selector + Print Slip + Next Transaction */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Segmented Toggle Control */}
              <div className="inline-flex rounded-xl border border-gray-200 bg-gray-100/90 p-1 text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPrintMode('CUSTOMER')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    printMode === 'CUSTOMER'
                      ? 'bg-white shadow-xs text-blue-700 font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Customer Receipt
                </button>

                <button
                  type="button"
                  onClick={() => setPrintMode('BANK')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    printMode === 'BANK'
                      ? 'bg-white shadow-xs text-purple-700 font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Branch Voucher (Internal Audit Voucher)
                </button>

                <button
                  type="button"
                  onClick={() => setPrintMode('DUAL')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    printMode === 'DUAL'
                      ? 'bg-white shadow-xs text-emerald-800 font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  2-in-1 Both
                </button>
              </div>

              {/* Print Slip Button */}
              <Button
                type="button"
                variant="secondary"
                onClick={() => handlePrintVoucher(printMode)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold shadow-xs cursor-pointer border-gray-300 hover:bg-gray-50"
              >
                <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print Slip</span>
              </Button>

              {/* Next Transaction Button */}
              <Button
                type="button"
                variant="primary"
                onClick={handleResetForNewTransaction}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold shadow-sm cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Next Transaction</span>
              </Button>
            </div>
          </div>

          {/* OFFICIAL COMMERCIAL BANK VOUCHER SHEET (PRINTABLE) */}
          <div id="printable-voucher" className="w-full space-y-3">
            {printMode === 'CUSTOMER' && renderSlip('CUSTOMER')}
            {printMode === 'BANK' && renderSlip('BANK')}
            {printMode === 'DUAL' && (
              <div className="space-y-2.5">
                {renderSlip('BANK')}
                <div className="relative py-1 flex items-center justify-center my-0.5">
                  <div className="w-full border-t-2 border-dashed border-gray-400"></div>
                  <span className="absolute bg-white px-3 py-0.5 text-[8.5px] font-mono font-bold text-gray-500 uppercase tracking-widest border border-gray-300 rounded-full shadow-2xs flex items-center gap-1">
                    ✂ Cut Here
                  </span>
                </div>
                {renderSlip('CUSTOMER')}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW 2: OTC OPERATIONS FORM (ACTIVE WHEN NO RECEIPT) */
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Over-the-Counter (OTC)</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Process direct counter cash deposits and cash withdrawals for walk-in customers.
              </p>
            </div>
          </div>

          {/* Top Teller Daily Cash Summary Widget */}
          

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left 2 Cols: Operations Form */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2 space-y-6">
              {/* Operation Switcher Tabs */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Select Counter Operation
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOperationType('DEPOSIT');
                      setError(null);
                    }}
                    className={[
                      'flex items-center justify-center gap-2 rounded-xl border p-3.5 text-sm font-semibold transition-all',
                      operationType === 'DEPOSIT'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Cash Deposit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOperationType('WITHDRAW');
                      setError(null);
                    }}
                    className={[
                      'flex items-center justify-center gap-2 rounded-xl border p-3.5 text-sm font-semibold transition-all',
                      operationType === 'WITHDRAW'
                        ? 'border-amber-600 bg-amber-50 text-amber-700 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                    <span>Cash Withdrawal</span>
                  </button>
                </div>
              </div>

              {error && (
                <div
                  ref={errorNoticeRef}
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 mt-0.5">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-red-800 text-sm">Operation Notice</p>
                      <p className="mt-0.5 text-red-700 leading-relaxed">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleInitiateConfirmation} className="space-y-5">
                {/* Account Lookup Row */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 1001234567"
                      value={accountNumber}
                      onChange={(e) => {
                        setAccountNumber(e.target.value);
                        setVerifiedAccount(null);
                        setAccountLookupError(null);
                        if (error) setError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleLookupAccount();
                        }
                      }}
                      className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={(e) => handleLookupAccount(e)}
                      disabled={isVerifying || !accountNumber.trim()}
                    >
                      {isVerifying ? 'Checking...' : 'Verify'}
                    </Button>
                  </div>
                  {accountLookupError && (
                    <p className="mt-1.5 text-xs text-red-600">{accountLookupError}</p>
                  )}
                </div>

                {/* Verified Account Card with Customer Profile Verification */}
                {verifiedAccount && (
                  <div
                    className={`rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-4.5 space-y-3.5 shadow-sm transition-opacity duration-200 ${
                      isVerifying ? 'opacity-60' : 'opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider">
                        <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Account Verified ✓</span>
                      </div>
                      <span
                        className={[
                          'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          verifiedAccount.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-red-100 text-red-800 border border-red-200',
                        ].join(' ')}
                      >
                        {verifiedAccount.status}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {/* Customer Avatar / Photo */}
                      <div className="relative shrink-0">
                        {verifiedAccount.profileImageUrl ? (
                          <img
                            src={verifiedAccount.profileImageUrl}
                            alt={verifiedAccount.customerName}
                            className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-sm ring-2 ring-blue-200"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`h-16 w-16 rounded-full bg-blue-600 text-white font-bold text-xl flex items-center justify-center border-2 border-white shadow-sm ring-2 ring-blue-200 ${
                            verifiedAccount.profileImageUrl ? 'hidden' : 'flex'
                          }`}
                        >
                          {verifiedAccount.customerName?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                      </div>

                      {/* Customer Identity Info Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5 text-xs flex-1 min-w-0 w-full">
                        <div className="min-w-0">
                          <span className="text-gray-500 block text-[11px] font-medium">Account Holder</span>
                          <span className="font-bold text-gray-900 text-sm block truncate mt-0.5">
                            {verifiedAccount.customerName}
                          </span>
                          <span className="text-[11px] font-mono text-gray-500 block mt-0.5">{verifiedAccount.customerCode}</span>
                        </div>

                        <div className="min-w-0">
                          <span className="text-gray-500 block text-[11px] font-medium">Available Balance</span>
                          <span className="font-bold text-blue-700 font-mono text-sm block mt-0.5">
                            {formatCurrency(verifiedAccount.availableBalance ?? 0, verifiedAccount.currency)}
                          </span>
                          <span className="text-[10px] text-gray-500 block mt-0.5">
                            Total: {formatCurrency(verifiedAccount.currentBalance ?? 0, verifiedAccount.currency)}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <span className="text-gray-500 block text-[11px] font-medium">NRC ID</span>
                          <span className="font-semibold text-gray-900 font-mono block text-xs mt-0.5">
                            {verifiedAccount.nrc || '—'}
                          </span>
                          <span className="text-[11px] text-gray-500 block mt-0.5">Phone: {verifiedAccount.phone || '—'}</span>
                        </div>

                        <div className="min-w-0">
                          <span className="text-gray-500 block text-[11px] font-medium">Account Type</span>
                          <span className="font-semibold text-gray-900 block text-xs mt-0.5">
                            {verifiedAccount.accountCategory}
                          </span>
                          <span className="text-[11px] text-gray-500 block mt-0.5">{verifiedAccount.accountType}</span>
                        </div>
                      </div>
                    </div>

                    {/* Counter Withdrawal Limits & Daily Utilization (Withdrawal Only) */}
                    {operationType === 'WITHDRAW' && (
                      <div className="mt-3 pt-3 border-t border-blue-100">
                        <div className="flex items-center justify-between pb-1.5 font-semibold text-gray-700 text-xs">
                          <span className="flex items-center gap-1.5 text-blue-900 font-bold">
                            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Counter Withdrawal Limits & Daily Utilization
                          </span>
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono font-medium">
                            {verifiedAccount.currency || 'MMK'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2">
                          <div className="bg-white/80 rounded-lg border border-blue-100 p-2 shadow-xs">
                            <span className="text-gray-500 block text-[10px] uppercase tracking-wider font-semibold">One-Time Limit</span>
                            <span className="font-bold text-gray-900 font-mono text-xs block mt-0.5">
                              {formatCurrency(accountLimits?.maxOnetimeWithdrawal ?? otcParams?.maxOnetimeWithdrawal ?? 5000000, verifiedAccount.currency || 'MMK')}
                            </span>
                          </div>
                          <div className="bg-white/80 rounded-lg border border-blue-100 p-2 shadow-xs">
                            <span className="text-gray-500 block text-[10px] uppercase tracking-wider font-semibold">Today's Withdrawn</span>
                            <span className="font-bold text-gray-900 font-mono text-xs block mt-0.5">
                              {formatCurrency(accountLimits?.todayWithdrawnAmount ?? 0, verifiedAccount.currency || 'MMK')}
                            </span>
                          </div>
                          <div className="bg-white/80 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2 shadow-xs">
                            <span className="text-emerald-700 block text-[10px] uppercase tracking-wider font-semibold">Available Remaining Today</span>
                            <span className="font-bold text-emerald-800 font-mono text-xs block mt-0.5">
                              {formatCurrency(
                                accountLimits?.remainingDailyLimit ?? (accountLimits?.maxDailyWithdrawal ?? otcParams?.maxDailyWithdrawal ?? 20000000),
                                verifiedAccount.currency || 'MMK'
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Section 1: Transaction Amount & Customer Statement Narration */}
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    1. Transaction & Statement Details
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                    <Input
                      label={`${operationType === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} Amount (${verifiedAccount?.currency || 'MMK'})`}
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 500,000"
                      value={amount}
                      onChange={(e) => {
                        handleAmountChange(e);
                        if (error) setError(null);
                      }}
                      required
                      disabled={isLoading}

                    />
                    {numAmount > 0 && (
                      <div className="mt-1.5 text-[11px] text-blue-700 bg-blue-50/80 px-2.5 py-1.5 rounded-lg border border-blue-100 flex items-start gap-1 font-medium shadow-xs">
                        <span className="text-blue-600 font-bold shrink-0">Amount in words:</span>
                        <span className="italic">{formatAmountToWords(numAmount, verifiedAccount?.currency || 'MMK')}</span>
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-500">
                      <span>
                        Service Fee:{' '}
                        <span className="font-semibold text-gray-700">
                          {formatFeeScheduleDescription(operationType, otcParams, verifiedAccount?.currency || 'MMK')}
                        </span>
                      </span>
                      {numAmount > 0 && (
                        <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                          Est. Fee: {formatCurrency(estimatedFee, verifiedAccount?.currency || 'MMK')}
                        </span>
                      )}
                    </div>
                  </div>
                    <Input
                      label="Customer Statement Narration"
                      placeholder={
                        operationType === 'DEPOSIT'
                          ? 'e.g. Salary Saving, Cash Deposit'
                          : 'e.g. Cash Out, House Rent'
                      }
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Section 2: Internal Teller & Audit Documentation */}
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    2. Counter Slip & Audit Details
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Counter Slip Number"
                      placeholder="e.g. SLIP-20261028-001 or Slip ID"
                      value={manualReferenceId}
                      onChange={(e) => setManualReferenceId(e.target.value)}
                      required
                      disabled={isLoading}
                      maxLength={64}
                    />
                    <Input
                      label="Internal Audit Note"
                      placeholder="e.g. Customer verified in person with NRC; cash notes counted."
                      value={manualAuditNote}
                      onChange={(e) => setManualAuditNote(e.target.value)}
                      required
                      disabled={isLoading}
                      maxLength={500}
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <Button
                    type="submit"
                    variant={operationType === 'DEPOSIT' ? 'primary' : 'danger'}
                    isLoading={isLoading || isPreValidating}
                    className="w-full sm:w-auto px-6 py-2.5 font-semibold shadow-sm"
                  >
                    {operationType === 'DEPOSIT' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Right 1 Col: Counter Transaction Limits */}
            <div className="space-y-4">
              {/* OTC System Limits & Rules Card */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 text-xs shadow-2xs">
                <div className="border-b border-gray-100 pb-2">
                  <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Counter Transaction Limits</span>
                  </h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Account Minimum Balance</span>
                    <span className="font-mono font-bold text-gray-900">
                      {formatCurrency(otcParams?.minimumBalance ?? 1000, 'MMK')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Minimum Deposit Amount</span>
                    <span className="font-mono font-bold text-gray-900">
                      {formatCurrency(otcParams?.minDepositAmount ?? 1000, 'MMK')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Minimum Withdrawal Amount</span>
                    <span className="font-mono font-bold text-gray-900">
                      {formatCurrency(otcParams?.minWithdrawalAmount ?? 1000, 'MMK')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">One-time Withdrawal Limit</span>
                    <span className="font-mono font-bold text-gray-900">
                      {formatCurrency(otcParams?.maxOnetimeWithdrawal ?? 1000000, 'MMK')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-600">Daily Withdrawal Limit</span>
                    <span className="font-mono font-bold text-gray-900">
                      {formatCurrency(otcParams?.maxDailyWithdrawal ?? 10000000, 'MMK')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal with Before vs After Balance Breakdown */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => {
          if (!isLoading) {
            setShowConfirmModal(false);
          }
        }}
        title={`Confirm Counter Cash ${operationType === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}`}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowConfirmModal(false)}
              disabled={isLoading}
            >
              Back / Cancel
            </Button>
            <Button
              type="button"
              variant={operationType === 'DEPOSIT' ? 'primary' : 'danger'}
              isLoading={isLoading}
              onClick={handleExecuteTransaction}
              className="px-6 font-bold"
            >
              {operationType === 'DEPOSIT'
                ? 'Confirm Deposit'
                : 'Confirm Withdrawal'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Account & Customer Summary Pill */}
          <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs">
            <div className="relative h-11 w-11 shrink-0">
              {verifiedAccount?.profileImageUrl ? (
                <img
                  src={verifiedAccount.profileImageUrl}
                  alt={verifiedAccount.customerName}
                  className="h-11 w-11 rounded-full object-cover border border-white shadow-sm ring-2 ring-blue-200"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`h-11 w-11 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm ring-2 ring-white ${
                  verifiedAccount?.profileImageUrl ? 'hidden' : 'flex'
                }`}
              >
                {verifiedAccount?.customerName?.charAt(0)?.toUpperCase() || 'C'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-sm truncate">
                  {verifiedAccount?.customerName}
                </span>
                <span className="rounded bg-blue-200/80 text-blue-800 px-1.5 py-0.5 text-[10px] font-mono font-semibold">
                  {verifiedAccount?.customerCode}
                </span>
              </div>
              <div className="text-gray-600 font-mono text-[11px] mt-0.5">
                Acc: <strong className="text-gray-900">{verifiedAccount?.accountNumber}</strong> • NRC: {verifiedAccount?.nrc || '—'}
              </div>
            </div>
          </div>

          {/* Balance Impact Breakdown Card (Current -> Transacted -> Projected) */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
            <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between">
              <span>Account Balance Summary</span>
              <span
                className={[
                  'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                  operationType === 'DEPOSIT'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800',
                ].join(' ')}
              >
                {operationType === 'DEPOSIT' ? '+ Cash Inflow' : '- Cash Outflow'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center divide-x divide-gray-200 bg-white p-3 rounded-lg border border-gray-200/70 shadow-2xs overflow-hidden">
              <div className="px-1 min-w-0">
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight truncate">
                  Current Balance
                </span>
                <span
                  className="block text-[11px] sm:text-xs font-mono font-bold text-gray-800 mt-1 whitespace-nowrap truncate"
                  title={formatCurrency(currentBal, verifiedAccount?.currency || 'MMK')}
                >
                  {formatCurrency(currentBal, verifiedAccount?.currency || 'MMK')}
                </span>
              </div>

              <div className="px-1 min-w-0">
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight truncate">
                  {operationType === 'DEPOSIT' ? 'Deposit Amount' : 'Withdrawal Amount'}
                </span>
                <span
                  className={[
                    'block text-[11px] sm:text-xs font-mono font-bold mt-1 whitespace-nowrap truncate',
                    operationType === 'DEPOSIT' ? 'text-emerald-600' : 'text-red-600',
                  ].join(' ')}
                  title={`${operationType === 'DEPOSIT' ? '+' : '-'} ${formatCurrency(numAmount, verifiedAccount?.currency || 'MMK')}`}
                >
                  {operationType === 'DEPOSIT' ? '+' : '-'} {formatCurrency(numAmount, verifiedAccount?.currency || 'MMK')}
                </span>
              </div>

              <div className="px-1 min-w-0">
                <span className="block text-[10px] font-bold text-amber-700 uppercase tracking-tight truncate">
                  Service Fee
                </span>
                <span
                  className="block text-[11px] sm:text-xs font-mono font-bold text-amber-700 mt-1 whitespace-nowrap truncate"
                  title={estimatedFee > 0 ? `- ${formatCurrency(estimatedFee, verifiedAccount?.currency || 'MMK')}` : '0 MMK Free'}
                >
                  {estimatedFee > 0 ? `- ${formatCurrency(estimatedFee, verifiedAccount?.currency || 'MMK')}` : '0 MMK Free'}
                </span>
              </div>

              <div className="px-1 min-w-0">
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight truncate">
                  New Available Balance
                </span>
                <span
                  className={[
                    'block text-[11px] sm:text-xs font-mono font-extrabold mt-1 whitespace-nowrap truncate',
                    projectedBal < 0 ? 'text-red-600' : 'text-blue-700',
                  ].join(' ')}
                  title={formatCurrency(projectedBal, verifiedAccount?.currency || 'MMK')}
                >
                  {formatCurrency(projectedBal, verifiedAccount?.currency || 'MMK')}
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50/70 p-2.5 text-xs text-blue-900 border border-blue-200/60 flex items-center justify-between">
              <span className="font-medium">
                {operationType === 'DEPOSIT'
                  ? `Net Credited to Customer Account: ${formatCurrency(netDeposit, verifiedAccount?.currency || 'MMK')} (${formatCurrency(numAmount, verifiedAccount?.currency || 'MMK')} cash - ${formatCurrency(estimatedFee, verifiedAccount?.currency || 'MMK')} fee)`
                  : `Total Debited from Customer Account: ${formatCurrency(totalWithdrawal, verifiedAccount?.currency || 'MMK')} (${formatCurrency(numAmount, verifiedAccount?.currency || 'MMK')} cash + ${formatCurrency(estimatedFee, verifiedAccount?.currency || 'MMK')} fee)`}
              </span>
              <span className="text-[10px] font-mono text-blue-700 font-semibold hidden sm:inline">
                Fee Schedule Applied
              </span>
            </div>



            {operationType === 'WITHDRAW' && projectedBal < 0 && (
              <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700 font-semibold border border-red-200 flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Warning: Projected balance falls below zero! This withdrawal will exceed available funds.</span>
              </div>
            )}
          </div>

          {/* Operational & Audit Details */}
          <div className="divide-y divide-gray-100 text-xs rounded-xl border border-gray-200 p-3.5 bg-white space-y-2.5 shadow-2xs">
            <div className="flex justify-between items-center pt-1">
              <span className="text-gray-500">Counter Slip No:</span>
              <span className="font-mono font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                {manualReferenceId}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-gray-500">Customer Statement Narration:</span>
              <span className="font-medium text-gray-800">{remark}</span>
            </div>
            <div className="flex flex-col gap-1 pt-2">
              <span className="text-gray-500">Internal Audit Note:</span>
              <span className="bg-gray-50 p-2 rounded text-[11px] text-gray-700 border border-gray-100 leading-relaxed font-sans">
                {manualAuditNote}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
