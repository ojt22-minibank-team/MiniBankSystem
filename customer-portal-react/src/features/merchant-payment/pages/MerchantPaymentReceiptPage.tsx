import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { PaymentReceipt } from "../components/PaymentReceipt";
import type { PaymentReceipt as ReceiptType, PaymentDetails } from "../types/merchantPayment";
import type { NotificationItem } from "../../notifications/types/notificationTypes";
import { getMyNotifications } from "../../notifications/services/notificationService";
import { useAppSelector, useAppDispatch } from "../../../lib/redux";
import { fetchMyAccounts } from "../../customer-account/accounts/stores/accountsSlice";

/**
 * Extracts the standardized Order Reference (e.g., ORD-2026-XXXX) from
 * a notification item. Safely parses the formatted notification message text
 * if the direct orderId property is not explicitly populated by the backend DTO.
 */
const extractOrderId = (item?: NotificationItem, fallbackRef: string = ""): string => {
  if (!item) return fallbackRef;
  if ((item as any).orderId && typeof (item as any).orderId === "string" && (item as any).orderId.trim() !== "") {
    return (item as any).orderId.trim();
  }
  if (item.message) {
    const match = item.message.match(/for Order #([^\s,;.]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return fallbackRef;
};

export const MerchantPaymentReceiptPage: React.FC = () => {
  const { t } = useTranslation("payment");
  const { transactionRef } = useParams<{ transactionRef: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const userAccounts = useAppSelector((state) => state.accounts.accounts);
  const defaultAccountNumber = userAccounts?.[0]?.accountNumber || "";

  useEffect(() => {
    if (!userAccounts || userAccounts.length === 0) {
      dispatch(fetchMyAccounts());
    }
  }, [dispatch, userAccounts]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<{
    receipt: ReceiptType;
    details: PaymentDetails;
    selectedAccount: string;
  } | null>(() => {
    const stateNoti = location.state?.notification as NotificationItem | undefined;
    if (stateNoti) {
      const amount = Number(stateNoti.amount || 0);
      const currency = stateNoti.currency || "MMK";
      const ref = stateNoti.transactionRef || transactionRef || `NOTI-${stateNoti.notificationId}`;
      const merchant = stateNoti.counterpartyName || t("merchantPartner");
      const sourceAcc =
        stateNoti.sourceAccountNumber ||
        defaultAccountNumber ||
        "0000";

      return {
        receipt: {
          success: true,
          message: stateNoti.message || t("paymentSuccessMessage"),
          paymentToken: ref,
          coreLedgerReference: ref,
          amount,
          currency,
          timestamp: stateNoti.createdAt || new Date().toISOString(),
        },
        details: {
          merchantName: merchant,
          orderId: extractOrderId(stateNoti, ref),
          amount,
          currency,
          status: "SUCCESS",
        },
        selectedAccount: sourceAcc,
      };
    }
    return null;
  });

  // If receiptData was not in location.state (e.g. page refresh), fetch notifications to locate it
  useEffect(() => {
    if (receiptData) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const loadReceiptFromNotifications = async () => {
      try {
        setLoading(true);
        setError(null);
        const notifications = await getMyNotifications();
        if (!isMounted) return;

        const match = notifications.find(
          (n) =>
            n.transactionRef === transactionRef ||
            String(n.notificationId) === transactionRef ||
            `NOTI-${n.notificationId}` === transactionRef
        );

        if (match) {
          const amount = Number(match.amount || 0);
          const currency = match.currency || "MMK";
          const ref = match.transactionRef || transactionRef || `NOTI-${match.notificationId}`;
          const merchant = match.counterpartyName || t("merchantPartner");
          const sourceAcc =
            match.sourceAccountNumber ||
            defaultAccountNumber ||
            "0000";

          setReceiptData({
            receipt: {
              success: true,
              message: match.message || t("paymentSuccessMessage"),
              paymentToken: ref,
              coreLedgerReference: ref,
              amount,
              currency,
              timestamp: match.createdAt || new Date().toISOString(),
            },
            details: {
              merchantName: merchant,
              orderId: extractOrderId(match, ref),
              amount,
              currency,
              status: "SUCCESS",
            },
            selectedAccount: sourceAcc,
          });
        } else {
          setError(t("receiptNotFoundOrExpired"));
        }
      } catch (err) {
        if (!isMounted) return;
        setError(t("unableToLoadReceipt"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadReceiptFromNotifications();

    return () => {
      isMounted = false;
    };
  }, [transactionRef, receiptData, defaultAccountNumber, t]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 text-[#00A3C4] animate-spin" />
        <p className="text-sm text-slate-500">{t("loadingReceipt")}</p>
      </div>
    );
  }

  if (error || !receiptData) {
    return (
      <div className="mx-auto max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 mt-8 shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{t("receiptNotFound")}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {error || t("couldNotRetrieveReceipt")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("backToDashboard")}
        </button>
      </div>
    );
  }

  return (
    <div className="py-6 px-4">
      <PaymentReceipt
        receipt={receiptData.receipt}
        details={receiptData.details}
        selectedAccount={receiptData.selectedAccount}
      />
    </div>
  );
};

export default MerchantPaymentReceiptPage;
