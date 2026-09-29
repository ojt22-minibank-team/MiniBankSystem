import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import LoginPage from "../../features/auth/pages/LoginPage";
import OtpPage from "../../features/auth/pages/OtpPage";
import ChangePasswordPage from "../../features/auth/pages/ChangePasswordPage";
import SetupPinPage from "../../features/auth/pages/SetupPinPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/otp",
    element: <OtpPage />,
  },
  {
    path: "/first-login/change-password",
    element: <ChangePasswordPage />,
  },
  {
    path: "/first-login/setup-pin",
    element: <SetupPinPage />,
  },
]);

function AppRouterProvider() {
  return (
    <RouterProvider router={router} />
  );
}

export default AppRouterProvider;