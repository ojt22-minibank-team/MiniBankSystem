
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import ProtectedRoute from "../../features/auth/components/ProtectedRoute";

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
import ProfilePage from "../../features/customer-account/profile/ProfilePage";

// ======================================================
// ROUTER
// ======================================================

const router = createBrowserRouter([

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
        element: <MainLayout />,

        children: [

          {
            path: "/dashboard",
            element: <DashboardPage />,
          },

          {
            path: "/accounts",
            element: <MyAccountsPage />,
          },

           {
            path: "/profile",
            element: <ProfilePage />,
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

        ],

      },

    ],

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