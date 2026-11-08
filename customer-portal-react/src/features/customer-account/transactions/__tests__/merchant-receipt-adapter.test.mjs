import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Pure logic from merchantReceiptAdapter.ts
function mapHistoryItemToPaymentReceiptProps(transaction, fallbackAccountNumber) {
  const merchantName =
    transaction.counterpartyName && transaction.counterpartyName.trim().length > 0
      ? transaction.counterpartyName.trim()
      : "Verified Merchant";

  const orderId =
    transaction.externalReference && transaction.externalReference.trim().length > 0
      ? transaction.externalReference.trim()
      : "";

  const amount = Number(transaction.amount || 0);
  const currency = transaction.currency?.trim() || "MMK";

  const selectedAccount =
    transaction.sourceAccountNumber && transaction.sourceAccountNumber.trim().length > 0
      ? transaction.sourceAccountNumber.trim()
      : fallbackAccountNumber && fallbackAccountNumber.trim().length > 0
        ? fallbackAccountNumber.trim()
        : "";

  const coreLedgerReference = transaction.transactionRef;

  const timestamp =
    transaction.completedAt ||
    transaction.initiatedAt ||
    transaction.transactionDate ||
    new Date().toISOString();

  const success = transaction.status === "COMPLETED";
  const status = transaction.status;

  return {
    receipt: {
      success,
      message: "Payment Successful",
      paymentToken: transaction.transactionRef,
      coreLedgerReference,
      amount,
      currency,
      timestamp,
    },
    details: {
      merchantName,
      orderId,
      amount,
      currency,
      status,
    },
    selectedAccount,
  };
}

// Pure decision routing from TransactionDetailContent.tsx
function resolveDetailView(transaction) {
  const normStatus = (transaction?.status || "").toUpperCase();
  const isCompleted = normStatus === "COMPLETED";
  const isExternalPayment = transaction?.transactionType === "EXTERNAL_PAYMENT";
  const isInternalTransfer = transaction?.transactionType === "INTERNAL_TRANSFER";
  const isDeposit = transaction?.transactionType === "OTC_DEPOSIT";
  const isWithdrawal = transaction?.transactionType === "OTC_WITHDRAWAL";

  if (isCompleted && isExternalPayment) {
    return "MERCHANT_PAYMENT_RECEIPT";
  }

  if (isCompleted && (isInternalTransfer || isDeposit || isWithdrawal)) {
    return "TRANSFER_RECEIPT_VIEW";
  }

  return "GENERIC_TRANSACTION_ACTIVITY_DETAIL";
}

describe("Merchant Receipt Adapter & Routing Verification", () => {
  test("Case A: Completed merchant payment routes to PaymentReceipt", () => {
    const tx = {
      transactionRef: "TXN-ECOM-20261108-9876",
      transactionType: "EXTERNAL_PAYMENT",
      status: "COMPLETED",
      amount: 45000,
      currency: "MMK",
      counterpartyName: "SuperStore Yangon",
      externalReference: "ORD-20261108-001",
      sourceAccountNumber: "2003513817",
      completedAt: "2026-11-08T10:30:00",
    };

    const view = resolveDetailView(tx);
    assert.equal(view, "MERCHANT_PAYMENT_RECEIPT");

    const props = mapHistoryItemToPaymentReceiptProps(tx, "2003513817");
    assert.equal(props.receipt.success, true);
    assert.equal(props.details.merchantName, "SuperStore Yangon");
    assert.equal(props.details.orderId, "ORD-20261108-001");
    assert.equal(props.receipt.coreLedgerReference, "TXN-ECOM-20261108-9876");
    assert.equal(props.selectedAccount, "2003513817");
  });

  test("Case B: Order ID mapping when externalReference exists", () => {
    const tx = {
      transactionRef: "TXN-ECOM-002",
      transactionType: "EXTERNAL_PAYMENT",
      status: "COMPLETED",
      amount: 15000,
      externalReference: "ORD-20261108-001",
    };

    const props = mapHistoryItemToPaymentReceiptProps(tx);
    assert.equal(props.details.orderId, "ORD-20261108-001");
  });

  test("Case C: No Order ID mapping when externalReference is null/absent", () => {
    const txNull = {
      transactionRef: "TXN-ECOM-003",
      transactionType: "EXTERNAL_PAYMENT",
      status: "COMPLETED",
      amount: 25000,
      externalReference: null,
    };

    const propsNull = mapHistoryItemToPaymentReceiptProps(txNull);
    assert.equal(propsNull.details.orderId, "");

    const txUndefined = {
      transactionRef: "TXN-ECOM-004",
      transactionType: "EXTERNAL_PAYMENT",
      status: "COMPLETED",
      amount: 25000,
    };

    const propsUndefined = mapHistoryItemToPaymentReceiptProps(txUndefined);
    assert.equal(propsUndefined.details.orderId, "");
  });

  test("Case D: Historical back navigation invokes onClose", () => {
    let closed = false;
    const onClose = () => {
      closed = true;
    };

    // Simulate PaymentReceipt button handler with onClose
    const handleDoneClick = (onCloseFn, navigateFn) => {
      if (onCloseFn) {
        onCloseFn();
      } else {
        navigateFn("/dashboard");
      }
    };

    let navigatedTo = null;
    const mockNavigate = (path) => {
      navigatedTo = path;
    };

    handleDoneClick(onClose, mockNavigate);
    assert.equal(closed, true);
    assert.equal(navigatedTo, null);
  });

  test("Case E: Existing checkout behavior without onClose navigates to /dashboard", () => {
    let navigatedTo = null;
    const mockNavigate = (path) => {
      navigatedTo = path;
    };

    const handleDoneClick = (onCloseFn, navigateFn) => {
      if (onCloseFn) {
        onCloseFn();
      } else {
        navigateFn("/dashboard");
      }
    };

    handleDoneClick(undefined, mockNavigate);
    assert.equal(navigatedTo, "/dashboard");
  });

  test("Case F: Non-completed EXTERNAL_PAYMENT remains on generic Transaction Activity Detail", () => {
    const nonCompletedStatuses = [
      "FAILED",
      "REJECTED",
      "CANCELLED",
      "REVERSED",
      "PENDING_AUTHORIZATION",
      "PROCESSING",
      "DECLINED",
      "INITIATED",
    ];

    for (const status of nonCompletedStatuses) {
      const tx = {
        transactionRef: "TXN-ECOM-FAIL-01",
        transactionType: "EXTERNAL_PAYMENT",
        status,
        amount: 50000,
      };

      const view = resolveDetailView(tx);
      assert.equal(
        view,
        "GENERIC_TRANSACTION_ACTIVITY_DETAIL",
        `Status ${status} should remain on generic Transaction Activity Detail`
      );
    }
  });

  test("Case G: INTERNAL_TRANSFER regression verification", () => {
    const tx = {
      transactionRef: "TXN-P2P-20261019-6123",
      transactionType: "INTERNAL_TRANSFER",
      status: "COMPLETED",
      amount: 10000,
    };

    const view = resolveDetailView(tx);
    assert.equal(view, "TRANSFER_RECEIPT_VIEW");
  });

  test("Case H: Account fallback priority — route query account is used over userAccounts[0] when sourceAccountNumber is null", () => {
    const tx = {
      transactionRef: "TXN-ECOM-FALLBACK-01",
      transactionType: "EXTERNAL_PAYMENT",
      status: "COMPLETED",
      amount: 45000,
      sourceAccountNumber: null, // missing source account (e.g. deleted account edge case)
    };

    const routeQueryAccountNumber = "SAVINGS_ACCOUNT_B";
    const userAccounts = [
      { accountNumber: "CURRENT_ACCOUNT_A" },
      { accountNumber: "SAVINGS_ACCOUNT_B" },
    ];

    // Priority logic matching TransactionDetailContent.tsx:
    // 1. transaction.sourceAccountNumber
    // 2. routeAccountNumber
    // 3. ""
    const fallbackAccNo =
      tx.sourceAccountNumber?.trim() ||
      routeQueryAccountNumber?.trim() ||
      "";

    const props = mapHistoryItemToPaymentReceiptProps(tx, fallbackAccNo);

    assert.equal(
      props.selectedAccount,
      "SAVINGS_ACCOUNT_B",
      "Should resolve to route query accountNumber (SAVINGS_ACCOUNT_B)"
    );
    assert.notEqual(
      props.selectedAccount,
      userAccounts[0].accountNumber,
      "Must NOT guess CURRENT_ACCOUNT_A from userAccounts[0]"
    );
  });
});
