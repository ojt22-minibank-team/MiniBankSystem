import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../../features/auth/pages/LoginPage';
import SignupPage from '../../features/auth/pages/SignupPage';
import StaffPasswordSetupPage from '../../features/auth/pages/StaffPasswordSetupPage';
import AdminDashboardPage from '../../features/admin/pages/AdminDashboardPage';
import StaffListPage from '../../features/admin/pages/StaffListPage';
import ProfilePage from '../../features/admin/pages/ProfilePage';
import SystemRulesPage from '../../features/admin/pages/SystemRulesPage';
import AnnouncementsPage from '../../features/admin/pages/AnnouncementsPage';
import CustomersPage from '../../features/admin/pages/CustomersPage';
import AccountsPage from '../../features/operations/pages/AccountsPage';
import OtcTransactionPage from '../../features/operations/pages/OtcTransactionPage';
import ReportingPage from '../../features/reporting/pages/ReportingPage';
import AuditLogsPage from '../../features/audit-logs/pages/AuditLogsPage';
import TransactionDetailsPage from '../../features/transactions/pages/TransactionDetailsPage';
import UnauthorizedPage from '../../components/common/UnauthorizedPage';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../../features/auth/hooks/useAuth';

/**
 * Dynamic root redirect: Routes authenticated users to their role-specific dashboard
 * (/teller/dashboard for Tellers, /admin/dashboard for Admin/Auditors) and unauthenticated
 * users to the login screen.
 */
function RootRedirect() {
  const { isAuthenticated, user, isTeller } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isTellerUser =
    isTeller ||
    (user as any)?.role?.includes('TELLER') ||
    user?.roles?.some(
      (r) => r === 'TELLER' || r === 'ROLE_TELLER' || r.includes('TELLER')
    );

  return <Navigate to={isTellerUser ? '/teller/dashboard' : '/admin/dashboard'} replace />;
}

export default function RouterProvider() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/register" element={<SignupPage />} />
        <Route path="/setup-password" element={<SignupPage />} />

        <Route path="/set-password" element={<SignupPage />} />
        <Route path="/staff-setup" element={<StaffPasswordSetupPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* ============================================================ */}
        {/* TELLER ROUTES (Strictly protected for TELLER role)           */}
        {/* ============================================================ */}
        <Route
          path="/teller/dashboard"
          element={
            <ProtectedRoute requiredRole="TELLER">
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teller/customers"
          element={
            <ProtectedRoute requiredRole="TELLER">
              <CustomersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teller/accounts"
          element={
            <ProtectedRoute requiredRole="TELLER">
              <AccountsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teller/otc"
          element={
            <ProtectedRoute requiredRole="TELLER">
              <OtcTransactionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teller/transactions"
          element={
            <ProtectedRoute requiredRole="TELLER">
              <TransactionDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teller/transactions/:refOrId"
          element={
            <ProtectedRoute requiredRole="TELLER">
              <TransactionDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teller/profile"
          element={
            <ProtectedRoute requiredRole="TELLER">
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teller/announcements"
          element={
            <ProtectedRoute requiredRole="TELLER">
              <AnnouncementsPage />
            </ProtectedRoute>
          }
        />

        {/* ============================================================ */}
        {/* ADMIN STAFF ROUTES (Strictly for ADMIN / AUDITOR staff)      */}
        {/* ============================================================ */}
        {/* Protected Dashboard */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
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

        {/* Profile (Admin / Staff Profile Management) */}
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
              <ProfilePage />
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

        {/* Announcements (Admin and Auditor only) */}
        <Route
          path="/admin/announcements"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
              <AnnouncementsPage />
            </ProtectedRoute>
          }
        />

        {/* Customers (Admin and Auditor only) */}
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
              <CustomersPage />
            </ProtectedRoute>
          }
        />

        {/* Bank Accounts (Admin and Auditor only) */}
        <Route
          path="/admin/accounts"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
              <AccountsPage />
            </ProtectedRoute>
          }
        />

        {/* OTC redirect: Route tellers to dedicated teller OTC path */}
        <Route
          path="/admin/otc"
          element={<Navigate to="/teller/otc" replace />}
        />

        {/* Transfers (Disabled in Admin Panel) */}
        <Route
          path="/admin/transfers"
          element={<Navigate to="/admin/dashboard" replace />}
        />

        {/* Transaction Explorer & Details (Admin and Auditor only) */}
        <Route
          path="/admin/transactions"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
              <TransactionDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/transactions/:refOrId"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
              <TransactionDetailsPage />
            </ProtectedRoute>
          }
        />

        {/* Audit Logs (Admin and Auditor only) */}
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
              <AuditLogsPage />
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

        {/* Default redirect based on stored/authenticated role */}
        <Route path="/" element={<RootRedirect />} />

        {/* 404 fallback */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
