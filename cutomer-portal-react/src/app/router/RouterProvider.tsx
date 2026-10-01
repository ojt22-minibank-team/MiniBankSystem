// import {
//   createBrowserRouter,
//   RouterProvider,
// } from "react-router-dom";

// import LoginPage from "../../features/auth/pages/LoginPage";
// import OtpPage from "../../features/auth/pages/OtpPage";
// import ChangePasswordPage from "../../features/auth/pages/ChangePasswordPage";
// import SetupPinPage from "../../features/auth/pages/SetupPinPage";
// import DashboardPage from "../../features/customer-account/dashboard/DashboardPage";
// import MainLayout from "../../components/layout/MainLayout";
// import MyAccountsPage from "../../features/customer-account/accounts/MyaccountPage";

// const router = createBrowserRouter([
//   {
//     path: "/",
//     element: <LoginPage />,
//   },
//   {
//     path: "/login",
//     element: <LoginPage />,
//   },
//   {
//     path: "/otp",
//     element: <OtpPage />,
//   },
//   {
//     path: "/first-login/change-password",
//     element: <ChangePasswordPage />,
//   },
//   {
//     path: "/first-login/setup-pin",
//     element: <SetupPinPage />,
//   },
// {
//     element: <MainLayout />,
//     children: [
//       {
//         path: "/dashboard",
//         element: <DashboardPage />,
//       },
//     ],
//   },

//   {
//   path: "/accounts",
//   element: <MyAccountsPage />,
// },
// ]);

// function AppRouterProvider() {
//   return (
//     <RouterProvider router={router} />
//   );
// }

// export default AppRouterProvider;

import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import ProtectedRoute from "../../features/auth/components/ProtectedRoute";

import LoginPage from "../../features/auth/pages/LoginPage";
import OtpPage from "../../features/auth/pages/OtpPage";
import ChangePasswordPage from "../../features/auth/pages/ChangePasswordPage";
import SetupPinPage from "../../features/auth/pages/SetupPinPage";

import DashboardPage from "../../features/customer-account/dashboard/DashboardPage";
import MainLayout from "../../components/layout/MainLayout";
import MyAccountsPage from "../../features/customer-account/accounts/MyaccountPage";
import ProfilePage from "../../features/customer-account/profile/ProfilePage";

const router = createBrowserRouter([

  // =========================================
  // PUBLIC AUTH PAGES
  // =========================================

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


  // =========================================
  // PROTECTED CUSTOMER PAGES
  // =========================================

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

        ],

      },

    ],

  },

]);


function AppRouterProvider() {

  return (
    <RouterProvider router={router} />
  );

}


export default AppRouterProvider;