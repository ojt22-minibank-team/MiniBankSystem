import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./features/auth/pages/LoginPage";

import DashboardPage from "./features/customer-account/dashboard/DashboardPage";
import MyAccountsPage from "./features/customer-account/accounts/MyaccountPage";
//import AccountDetailPage from "./features/customer-account/accounts/AccountDetailPage";

import MainLayout from "./components/layout/MainLayout";

function App() {
  return (
    <Routes>
      {/* =====================================================
          PUBLIC ROUTES
      ====================================================== */}

      <Route path="/" element={<LoginPage />} />

      {/* =====================================================
          CUSTOMER PORTAL
      ====================================================== */}

      <Route element={<MainLayout />}>
        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        {/* My Accounts */}
        <Route
          path="/accounts"
          element={<MyAccountsPage />}
        />

        {/* Account Details */}
        {/* <Route
          path="/accounts/:accountNumber"
          element={<AccountDetailPage />}
        /> */}
      </Route>

      {/* =====================================================
          FALLBACK
      ====================================================== */}

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default App;