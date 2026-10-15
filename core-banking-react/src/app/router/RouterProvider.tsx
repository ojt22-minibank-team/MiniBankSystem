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

export default function RouterProvider() {
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

        {/* Customers (Accessible to staff) */}
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
