import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Helper representing the exact navigation decision logic from RecentTransactions.tsx
function computeRowNavigation(tx, activeAccountNumber) {
  const normType = (tx?.transactionType || "").toUpperCase();
  const ref = (tx?.transactionRef || "").toUpperCase();

  const isTransfer =
    normType === "INTERNAL_TRANSFER" ||
    normType.includes("TRANSFER") ||
    ref.startsWith("TXN-P2P") ||
    ref.startsWith("TXN-TRANSFER");

  const isExternalPayment = normType === "EXTERNAL_PAYMENT";

  if (isTransfer) {
    return {
      destination: `/receipt/${encodeURIComponent(tx.transactionRef)}`,
      options: {
        state: {
          from: "/dashboard",
        },
      },
    };
  } else if (isExternalPayment) {
    const cleanRef = tx?.transactionRef ? tx.transactionRef.trim() : "";
    const cleanAcc = activeAccountNumber ? activeAccountNumber.trim() : "";
    if (cleanRef && cleanAcc) {
      return {
        destination: `/transaction/${encodeURIComponent(cleanRef)}?accountNumber=${encodeURIComponent(cleanAcc)}`,
        options: {
          state: {
            transaction: tx,
            from: "/dashboard",
          },
        },
      };
    } else {
      return { destination: "/transaction" };
    }
  } else {
    return { destination: "/transaction" };
  }
}

describe("RecentTransactions Navigation Logic", () => {
  test("Case A: EXTERNAL_PAYMENT navigates directly to /transaction/:ref?accountNumber=:acc", () => {
    const tx = {
      transactionRef: "TXN-ECOM-20261108-123456",
      transactionType: "EXTERNAL_PAYMENT",
      amount: 10000,
      currency: "MMK",
      direction: "OUT",
    };
    const activeAccountNumber = "2003513817";

    const nav = computeRowNavigation(tx, activeAccountNumber);
    assert.equal(
      nav.destination,
      "/transaction/TXN-ECOM-20261108-123456?accountNumber=2003513817"
    );
    assert.equal(nav.options?.state?.from, "/dashboard");
    assert.deepEqual(nav.options?.state?.transaction, tx);
  });

  test("Case B: INTERNAL_TRANSFER preserves existing transfer receipt navigation", () => {
    const tx = {
      transactionRef: "TXN-P2P-20261019-6123",
      transactionType: "INTERNAL_TRANSFER",
      amount: 5000,
      currency: "MMK",
      direction: "OUT",
    };
    const activeAccountNumber = "2003513817";

    const nav = computeRowNavigation(tx, activeAccountNumber);
    assert.equal(nav.destination, "/receipt/TXN-P2P-20261019-6123");
    assert.equal(nav.options?.state?.from, "/dashboard");
  });

  test("Case C: Other transaction types (OTC_DEPOSIT, OTC_WITHDRAWAL, REFUND) navigate to /transaction", () => {
    const types = ["OTC_DEPOSIT", "OTC_WITHDRAWAL", "REFUND", "LEDGER_ADJUSTMENT", "UNKNOWN_FUTURE_TYPE"];

    for (const type of types) {
      const tx = {
        transactionRef: `REF-${type}-001`,
        transactionType: type,
        amount: 2000,
        currency: "MMK",
      };
      const nav = computeRowNavigation(tx, "2003513817");
      assert.equal(nav.destination, "/transaction", `Failed for type ${type}`);
    }
  });

  test("Case D: Missing or blank transactionRef safely falls back to /transaction", () => {
    const txNullRef = {
      transactionRef: null,
      transactionType: "EXTERNAL_PAYMENT",
    };
    assert.equal(computeRowNavigation(txNullRef, "2003513817").destination, "/transaction");

    const txBlankRef = {
      transactionRef: "   ",
      transactionType: "EXTERNAL_PAYMENT",
    };
    assert.equal(computeRowNavigation(txBlankRef, "2003513817").destination, "/transaction");

    const txEmptyRef = {
      transactionRef: "",
      transactionType: "EXTERNAL_PAYMENT",
    };
    assert.equal(computeRowNavigation(txEmptyRef, "2003513817").destination, "/transaction");
  });

  test("Case E: Manual account selection (SAVINGS) uses the selected account in the query string", () => {
    const tx = {
      transactionRef: "TXN-ECOM-20261108-999999",
      transactionType: "EXTERNAL_PAYMENT",
    };
    const savingsAccount = "1008207493";

    const nav = computeRowNavigation(tx, savingsAccount);
    assert.equal(
      nav.destination,
      "/transaction/TXN-ECOM-20261108-999999?accountNumber=1008207493"
    );
  });

  test("Case F: Missing activeAccountNumber safely falls back to /transaction", () => {
    const tx = {
      transactionRef: "TXN-ECOM-20261108-999999",
      transactionType: "EXTERNAL_PAYMENT",
    };
    assert.equal(computeRowNavigation(tx, "").destination, "/transaction");
    assert.equal(computeRowNavigation(tx, null).destination, "/transaction");
    assert.equal(computeRowNavigation(tx, "   ").destination, "/transaction");
  });
});
