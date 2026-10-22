
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";

import ProtectedRoute from "../../features/auth/components/ProtectedRoute";
import SessionTimeoutProvider from "../../features/auth/components/SessionTimeoutProvider";
import { corporateAuthRoutes } from "../../features/corporate-auth/routes";

// ======================================================
// AUTH PAGES
// ======================================================

import LoginPage from "../../features/auth/pages/LoginPage";
import OtpPage from "../../features/auth/pages/OtpPage";
import ChangePasswordPage from "../../features/auth/pages/ChangePasswordPage";
import SetupPinPage from "../../features/auth/pages/SetupPinPage";

// Password Reset Pages
import ForgotPasswordPage from "../../features/auth/pages/ForgotPasswordPage";
import PasswordResetOtpPage from "../../features/auth/pages/PasswordResetOtpPage";
import ResetPasswordPage from "../../features/auth/pages/ResetPasswordPage";

//pin reset pages
import PinResetOtpPage from "../../features/auth/pages/PinResetOtpPage";
import PinResetNewPinPage from "../../features/auth/pages/PinResetNewPinPage";


// ======================================================
// CUSTOMER PAGES
// ======================================================

import DashboardPage from "../../features/customer-account/dashboard/DashboardPage";
import MainLayout from "../../components/layout/MainLayout";
import MyAccountsPage from "../../features/customer-account/accounts/MyaccountPage";
import { MerchantPaymentAuthorize } from "../../features/merchant-payment/pages/MerchantPaymentAuthorize";

import ProfilePage from "../../features/customer-account/profile/ProfilePage";
import { P2PTransferForm } from "../../features/transfer/components/P2PTransferForm";
import AccountDetailPage from "../../features/customer-account/accounts/AccountDetailPage";
import SettingsPage from "../../features/customer-account/settings/pages/SettingsPage";
import AnnouncementsPage from "../../features/customer-account/announcements/AnnouncementsPage";
import BeneficiariesPage from "../../features/beneficiaries/pages/BeneficiariesPage";
import AccountStatementPage from "../../features/customer-account/statements/pages/AccountStatementPage";
import TransactionHistoryPage from "../../features/customer-account/transactions/pages/TransactionHistoryPage";

// ======================================================
// ROUTER
// ======================================================

const router = createBrowserRouter([

  // =========================================
  // PUBLIC AUTH PAGES & STANDALONE PAGES
  // =========================================
  ...corporateAuthRoutes,

  // ====================================================
  // PUBLIC AUTH PAGES
  // ====================================================

  {
    path: "/",
    element: <LoginPage />,
  },

  {
    path: "/login",
    element: <LoginPage />,
  },


  // ====================================================
  // LOGIN OTP
  // ====================================================

  {
    path: "/otp",
    element: <OtpPage />,
  },


  // ====================================================
  // FIRST LOGIN
  // ====================================================

  {
    path: "/first-login/change-password",
    element: <ChangePasswordPage />,
  },

  {
    path: "/first-login/setup-pin",
    element: <SetupPinPage />,
  },



  // =========================================
  // ====================================================
  // FORGOT PASSWORD / PASSWORD RESET
  // ====================================================

  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
  },

  {
    path: "/password-reset/otp",
    element: <PasswordResetOtpPage />,
  },

  {
    path: "/password-reset/new-password",
    element: <ResetPasswordPage />,
  },


  // ====================================================
  // PROTECTED CUSTOMER PAGES
  // ====================================================

  {
    element: <ProtectedRoute />,

    children: [


      {
        element: (
          <SessionTimeoutProvider>
            <MainLayout />
          </SessionTimeoutProvider>
        ),

        children: [

          {
            path: "/checkout",
            element: <MerchantPaymentAuthorize />,
          },

          {
            path: "/merchant-payment/authorize",
            element: <MerchantPaymentAuthorize />,
          },

          {
            path: "/merchant-payment",
            element: <MerchantPaymentAuthorize />,
          },

          {
            path: "/dashboard",
            element: <DashboardPage />,
          },

          {
            path: "/accounts",
            element: <MyAccountsPage />,
          },

          {
            path: "/accounts/:accountNumber",
            element: <AccountDetailPage />,
          },

          {
            path: "/statements",
            element: <AccountStatementPage />,
          },

          {
            path: "/transaction",
            element: <TransactionHistoryPage />,
          },

          {
            path: "/profile",
            element: <ProfilePage />,
          },

          {
            path: "/settings",
            element: <SettingsPage />,
          },

          {
            path: "/announcements",
            element: <AnnouncementsPage />,
          },

          //pin reset pages

          {
            path: "/pin-reset/otp",
            element: <PinResetOtpPage />,
          },

          {
            path: "/pin-reset/new-pin",
            element: <PinResetNewPinPage />,
          },

          {
            path: "/transfer",
            element: <P2PTransferForm />,
          },

          {
            path: "/beneficiaries",
            element: <BeneficiariesPage />,
          },

        ],

      },

    ],

  },

  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },

]);


// ======================================================
// ROUTER PROVIDER
// ======================================================

function AppRouterProvider() {

  return (
    <RouterProvider router={router} />
  );

}

export default AppRouterProvider;
