import { Navigate, Route, Routes } from "react-router-dom";

import DashboardPage from "./features/customer-account/dashboard/DashboardPage";
import MainLayout from "./components/layout/MainLayout";
// import MyAccountsPage from "../features/customer-account/accounts/MyAccountsPage";
// import AccountDetailPage from "../features/customer-account/accounts/AccountDetailPage";
// import ProfilePage from "../features/customer-account/profile/ProfilePage";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/dashboard" replace />}
      />
      <Route path="/" element={<MainLayout />}>
        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />
      </Route>

      {/* <Route
        path="/accounts"
        element={<MyAccountsPage />}
      /> */}

      {/* <Route
        path="/accounts/:accountId"
        element={<AccountDetailPage />}
      /> */}

      {/* <Route
        path="/profile"
        element={<ProfilePage />}
      /> */}

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}

export default App;