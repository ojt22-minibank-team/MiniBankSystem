import type { RouteObject } from "react-router-dom";
import CorporateProtectedRoute from "./components/CorporateProtectedRoute";
import CorporateLoginPage from "./pages/CorporateLoginPage";
import CorporateOtpPage from "./pages/CorporateOtpPage";
import CorporateChangePasswordPage from "./pages/CorporateChangePasswordPage";
import CorporateSetupPinPage from "./pages/CorporateSetupPinPage";
import CorporateAuthSuccessPage from "./pages/CorporateAuthSuccessPage";

export const corporateAuthRoutes: RouteObject[] = [
  { path: "/corporate/login", element: <CorporateLoginPage /> },
  { path: "/corporate/otp", element: <CorporateOtpPage /> },
  { path: "/corporate/first-login/change-password", element: <CorporateChangePasswordPage /> },
  { path: "/corporate/first-login/setup-pin", element: <CorporateSetupPinPage /> },
  { element: <CorporateProtectedRoute />, children: [
    { path: "/corporate/auth-success", element: <CorporateAuthSuccessPage /> },
  ] },
];
