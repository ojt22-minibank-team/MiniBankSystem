import { Navigate, Route, Routes } from "react-router-dom";

import DashboardPage from "./features/customer-account/dashboard/DashboardPage";
import MainLayout from "./components/layout/MainLayout";
// import MyAccountsPage from "../features/customer-account/accounts/MyAccountsPage";
// import AccountDetailPage from "../features/customer-account/accounts/AccountDetailPage";
// import ProfilePage from "../features/customer-account/profile/ProfilePage";
import LoginPage from "./features/auth/pages/LoginPage";

function App() {
  return (
    <LoginPage />
  );
}

export default App;