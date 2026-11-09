import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const enJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../../i18n/locales/en/transaction.json'), 'utf-8')
);
const myJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../../i18n/locales/my/transaction.json'), 'utf-8')
);

// Replicate pure helper and mapping from TransactionStatusBadge & transactionHistoryTypes
const STATUS_I18N_KEYS = {
  COMPLETED: "completed",
  FAILED: "failed",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  REVERSED: "reversed",
  PENDING_AUTHORIZATION: "pendingAuthorization",
  INITIATED: "initiated",
  HELD: "held",
};

function formatStatusLabel(status) {
  if (!status) return "";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function resolveDisplayLabel(status, localeJson = enJson) {
  const normalizedStatus = (status || "").trim().toUpperCase();
  const i18nKey = STATUS_I18N_KEYS[normalizedStatus];

  if (i18nKey && localeJson.detailContent?.status?.[i18nKey]) {
    return localeJson.detailContent.status[i18nKey];
  }

  return formatStatusLabel(status) || localeJson.detailContent?.status?.unknown || "Unknown";
}

describe("TransactionStatusBadge Label Resolution", () => {
  test("Case 1: COMPLETED resolves to 'Completed' in EN and 'ပြီးမြောက်သည်' in MY", () => {
    assert.equal(resolveDisplayLabel("COMPLETED", enJson), "Completed");
    assert.equal(resolveDisplayLabel("COMPLETED", myJson), "ပြီးမြောက်သည်");
    assert.notEqual(resolveDisplayLabel("COMPLETED", enJson), "Unknown");
  });

  test("Case 2: FAILED resolves to 'Failed' in EN", () => {
    assert.equal(resolveDisplayLabel("FAILED", enJson), "Failed");
    assert.notEqual(resolveDisplayLabel("FAILED", enJson), "Unknown");
  });

  test("Case 3: REJECTED resolves to 'Rejected' in EN", () => {
    assert.equal(resolveDisplayLabel("REJECTED", enJson), "Rejected");
    assert.notEqual(resolveDisplayLabel("REJECTED", enJson), "Unknown");
  });

  test("Case 4: CANCELLED resolves to 'Cancelled' in EN", () => {
    assert.equal(resolveDisplayLabel("CANCELLED", enJson), "Cancelled");
    assert.notEqual(resolveDisplayLabel("CANCELLED", enJson), "Unknown");
  });

  test("Case 5: REVERSED resolves to 'Reversed' in EN", () => {
    assert.equal(resolveDisplayLabel("REVERSED", enJson), "Reversed");
    assert.notEqual(resolveDisplayLabel("REVERSED", enJson), "Unknown");
  });

  test("Case 6: PENDING_AUTHORIZATION resolves to 'Pending Authorization' in EN", () => {
    assert.equal(resolveDisplayLabel("PENDING_AUTHORIZATION", enJson), "Pending Authorization");
    assert.notEqual(resolveDisplayLabel("PENDING_AUTHORIZATION", enJson), "Unknown");
  });

  test("Case 7: INITIATED resolves to 'Initiated' in EN", () => {
    assert.equal(resolveDisplayLabel("INITIATED", enJson), "Initiated");
    assert.notEqual(resolveDisplayLabel("INITIATED", enJson), "Unknown");
  });

  test("Case 8: HELD resolves to 'Held' in EN", () => {
    assert.equal(resolveDisplayLabel("HELD", enJson), "Held");
    assert.notEqual(resolveDisplayLabel("HELD", enJson), "Unknown");
  });

  test("Case 9: Unknown future status (MANUAL_REVIEW) safely formats via formatStatusLabel", () => {
    assert.equal(resolveDisplayLabel("MANUAL_REVIEW", enJson), "Manual Review");
    assert.notEqual(resolveDisplayLabel("MANUAL_REVIEW", enJson), "Unknown");
  });

  test("Case 10: Missing/empty/null status safely falls back to 'Unknown'", () => {
    assert.equal(resolveDisplayLabel("", enJson), "Unknown");
    assert.equal(resolveDisplayLabel(null, enJson), "Unknown");
    assert.equal(resolveDisplayLabel(undefined, enJson), "Unknown");
  });

  test("Case 11: Defensively handles lowercase and whitespace in status string", () => {
    assert.equal(resolveDisplayLabel("  completed  ", enJson), "Completed");
    assert.equal(resolveDisplayLabel("pending_authorization", enJson), "Pending Authorization");
  });
});
