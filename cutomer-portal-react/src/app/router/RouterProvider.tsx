import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import LoginPage from "../../features/auth/pages/LoginPage";
import OtpPage from "../../features/auth/pages/OtpPage";

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
]);

function AppRouterProvider() {
  return <RouterProvider router={router} />;
}

export default AppRouterProvider;