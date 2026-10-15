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
import UnauthorizedPage from '../../components/common/UnauthorizedPage';
import ProtectedRoute from './ProtectedRoute';

// Staff Operations Pages
import StaffDashboard from '../../pages/StaffDashboard';
import CustomerListView from '../../pages/CustomerListView';
import CustomerRegistrationView from '../../pages/CustomerRegistrationView';
import CustomerEditView from '../../pages/CustomerEditView';
import AccountListView from '../../pages/AccountListView';
import RetailAccountCreateView from '../../pages/RetailAccountCreateView';
import CorporateAccountCreateView from '../../pages/CorporateAccountCreateView';

export default function RouterProvider() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup-password" element={<StaffPasswordSetupPage />} />
        <Route path="/set-password" element={<StaffPasswordSetupPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Staff Dashboard (Primary for staff & operations) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/dashboard"
          element={
            <ProtectedRoute>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected Admin Dashboard (available to authenticated staff / admin) */}
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

        {/* Customer Management */}
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <CustomerListView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/new"
          element={
            <ProtectedRoute>
              <CustomerRegistrationView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:customerCode/edit"
          element={
            <ProtectedRoute>
              <CustomerEditView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute>
              <CustomersPage />
            </ProtectedRoute>
          }
        />

        {/* Bank Accounts */}
        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <AccountListView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts/new"
          element={
            <ProtectedRoute>
              <RetailAccountCreateView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts/corporate/new"
          element={
            <ProtectedRoute>
              <CorporateAccountCreateView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/accounts"
          element={
            <ProtectedRoute>
              <AccountsPage />
            </ProtectedRoute>
          }
        />

        {/* Transfers (Teller or Admin) */}
        <Route
          path="/admin/transfers"
          element={
            <ProtectedRoute>
              <TransfersPage />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export { RouterProvider };