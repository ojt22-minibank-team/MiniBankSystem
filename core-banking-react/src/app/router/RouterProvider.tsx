import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../../features/auth/pages/LoginPage';
import StaffPasswordSetupPage from '../../features/auth/pages/StaffPasswordSetupPage';
import AdminDashboardPage from '../../features/admin/pages/AdminDashboardPage';
import StaffListPage from '../../features/admin/pages/StaffListPage';
import SystemRulesPage from '../../features/admin/pages/SystemRulesPage';
import AnnouncementsPage from '../../features/admin/pages/AnnouncementsPage';
import CustomersPage from '../../features/admin/pages/CustomersPage';
import AccountsPage from '../../features/operations/pages/AccountsPage';
import TransfersPage from '../../features/operations/pages/TransfersPage';
import ReportingPage from '../../features/reporting/pages/ReportingPage';
import UnauthorizedPage from '../../components/common/UnauthorizedPage';
import ProtectedRoute from './ProtectedRoute';

import AdminLayout from '../../components/layout/AdminLayout';
import CustomerRegistrationView from '../../pages/CustomerRegistrationView';
import RetailAccountCreateView from '../../pages/RetailAccountCreateView';
import CorporateAccountCreateView from '../../pages/CorporateAccountCreateView';
import DepositFundsView from '../../pages/DepositFundsView';

export function RouterProvider() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup-password" element={<StaffPasswordSetupPage />} />
        <Route path="/set-password" element={<StaffPasswordSetupPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected Dashboard (available to authenticated staff) */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Admin / Auditor: Staff Management */}
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <StaffListPage />
            </ProtectedRoute>
          }
        />

        {/* Admin: System Rules */}
        <Route
          path="/admin/system-rules"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <SystemRulesPage />
            </ProtectedRoute>
          }
        />

        {/* Announcements (Accessible to authenticated staff) */}
        <Route
          path="/admin/announcements"
          element={
            <ProtectedRoute>
              <AnnouncementsPage />
            </ProtectedRoute>
          }
        />

        {/* Customers Directory (Accessible to all staff) */}
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute>
              <CustomersPage />
            </ProtectedRoute>
          }
        />

        {/* Customer Registration (Teller & Admin) */}
        <Route
          path="/admin/customers/new"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'TELLER']}>
              <AdminLayout pageTitle="New Customer Registration">
                <CustomerRegistrationView />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/customers/new" element={<Navigate to="/admin/customers/new" replace />} />
        <Route path="/customers" element={<Navigate to="/admin/customers" replace />} />

        {/* Bank Accounts Directory */}
        <Route
          path="/admin/accounts"
          element={
            <ProtectedRoute>
              <AccountsPage />
            </ProtectedRoute>
          }
        />

        {/* Retail Account Opening (Teller & Admin) */}
        <Route
          path="/admin/accounts/new"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'TELLER']}>
              <AdminLayout pageTitle="Open Retail Account">
                <RetailAccountCreateView />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/accounts/new" element={<Navigate to="/admin/accounts/new" replace />} />

        {/* Corporate Account Opening (Teller & Admin) */}
        <Route
          path="/admin/accounts/corporate/new"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'TELLER']}>
              <AdminLayout pageTitle="Open Corporate Account">
                <CorporateAccountCreateView />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/accounts/corporate/new" element={<Navigate to="/admin/accounts/corporate/new" replace />} />

        {/* Counter Deposit Funds (Teller & Admin) */}
        <Route
          path="/admin/accounts/deposit"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'TELLER']}>
              <AdminLayout pageTitle="Deposit Funds">
                <DepositFundsView />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/accounts/deposit" element={<Navigate to="/admin/accounts/deposit" replace />} />
        <Route path="/accounts" element={<Navigate to="/admin/accounts" replace />} />

        {/* Transfers (Teller or Admin) */}
        <Route
          path="/admin/transfers"
          element={
            <ProtectedRoute>
              <TransfersPage />
            </ProtectedRoute>
          }
        />

        {/* Reporting (Admin and Auditor only; Tellers blocked) */}
        <Route
          path="/admin/reporting"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
              <ReportingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={<Navigate to="/admin/reporting" replace />}
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default RouterProvider;
